// --- 1. Supabaseクライアントのセットアップ ---
// 必ずSupabaseで取得した、あなたのキーに置き換えてください！
const SUPABASE_URL = 'https://thrynpdnngvnfwusyzmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocnlucGRubmd2bmZ3dXN5em1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODczNDEsImV4cCI6MjA2NzQ2MzM0MX0.JPgVeBKyE9mfzLOUoSgrhgHpewVY6nV1k4s7blZNhTQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM要素の取得 ---
const timerEl = document.getElementById('timer');
const radiusEl = document.getElementById('radius');
const instructionEl = document.getElementById('instruction');

// --- グローバル変数 ---
let currentCircle = null;
let map = null;
let userMarker = null;

// --- イージング関数 ---
function easeOutQuad(t) {
    return t * (2 - t);
}

// --- メインアプリケーションロジック ---
async function main() {
    // 2. Supabaseから有効なイベントデータを取得
    const { data: event, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_time_utc', { ascending: true })
        .limit(1)
        .single();

    if (error || !event) {
        console.error('イベントデータの取得エラー、または有効なイベントがありません:', error);
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif;">
                <h1>現在開催中のイベントはありません</h1>
                <p>次のイベントをお楽しみに！</p>
            </div>
        `;
        return;
    }

    // 3. 地図の初期化
    const initialCenter = { lat: event.initial_lat, lng: event.initial_lng };

    // ★★★ ここからが修正点 ★★★
    // 地図のオプションで、デフォルトのUIを制御する
    map = L.map('map', {
        zoomControl: false, // 拡大縮小ボタンを非表示にする
        attributionControl: false // 右下のクレジット表記も非表示にする（任意）
    }).setView([initialCenter.lat, initialCenter.lng], 12);
    // ★★★ ここまでが修正点 ★★★

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Leafletのカスタムコントロールとして現在地ボタンを作成・追加
    const GpsControl = L.Control.extend({
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.backgroundColor = 'white';
            container.style.width = '34px';
            container.style.height = '34px';
            container.style.cursor = 'pointer';
            container.title = '現在地を表示';

            container.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 20px; height: 20px; margin: 7px; fill: #555;">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                </svg>
            `;

            L.DomEvent.on(container, 'click', e => {
                L.DomEvent.stop(e);
                locateUser();
            });

            return container;
        }
    });
    // 作成したコントロールを「右上」に追加
    new GpsControl({ position: 'topright' }).addTo(map);

    // 4. 最終地点のピンを表示
    const finalCenter = { lat: event.final_lat, lng: event.final_lng };
    L.marker([finalCenter.lat, finalCenter.lng])
        .addTo(map)
        .bindPopup("🚩 最終地点")
        .openPopup();

    // 5. イベント更新ループを開始
    // (ループのロジックは変更なし)
    const totalDuration = event.duration_seconds;
    const initialRadius = event.initial_radius_m;
    const finalRadius = event.final_radius_m;
    const eventStartTime = new Date(event.start_time_utc).getTime();

    const intervalId = setInterval(() => {
        const now = Date.now();
        const elapsedTime = (now - eventStartTime) / 1000;

        if (elapsedTime < 0) {
            const waitTime = Math.abs(elapsedTime);
            const hours = Math.floor(waitTime / 3600);
            const minutes = Math.floor((waitTime % 3600) / 60);
            const seconds = Math.floor(waitTime % 60);
            timerEl.textContent = `開始まで ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            radiusEl.textContent = initialRadius;

            if (!currentCircle) {
                currentCircle = L.circle(initialCenter, { radius: initialRadius, color: "#999", fillColor: "#ccc", fillOpacity: 0.2 }).addTo(map);
            }
            return;
        }

        const progress = Math.min(elapsedTime / totalDuration, 1.0);
        const easedProgress = easeOutQuad(progress);

        const currentCenter = {
            lat: initialCenter.lat + (finalCenter.lat - initialCenter.lat) * easedProgress,
            lng: initialCenter.lng + (finalCenter.lng - finalCenter.lng) * easedProgress
        };
        const currentRadius = initialRadius - (initialRadius - finalRadius) * easedProgress;

        if (!currentCircle) {
            currentCircle = L.circle(currentCenter, { radius: currentRadius, color: "#3498db", fillColor: "#aed6f1", fillOpacity: 0.4 }).addTo(map);
        } else {
            currentCircle.setLatLng(currentCenter);
            currentCircle.setRadius(currentRadius);
            if (currentCircle.options.color === '#999') {
                currentCircle.setStyle({ color: "#3498db", fillColor: "#aed6f1", fillOpacity: 0.4 });
            }
        }

        const timeLeft = Math.max(0, totalDuration - elapsedTime);
        const hours_left = Math.floor(timeLeft / 3600);
        const minutes_left = Math.floor((timeLeft % 3600) / 60);
        const seconds_left = Math.floor(timeLeft % 60);
        timerEl.textContent = `${hours_left.toString().padStart(2, '0')}:${minutes_left.toString().padStart(2, '0')}:${seconds_left.toString().padStart(2, '0')}`;
        radiusEl.textContent = Math.round(currentRadius);

        if (progress >= 1.0) {
            clearInterval(intervalId);
            instructionEl.classList.remove('hidden');
            currentCircle.setStyle({ color: "#e74c3c", fillColor: "#f5b7b1" });
        }
    }, 1000);
}

// --- GPS取得ロジック ---
function locateUser() {
    if (!map) return;

    if (!("geolocation" in navigator)) {
        alert("この端末は位置情報に対応していません");
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };

        if (!userMarker) {
            userMarker = L.marker(userPos).addTo(map).bindPopup("あなたはここにいます");
        } else {
            userMarker.setLatLng(userPos);
        }

        map.setView(userPos, 16);
        userMarker.openPopup();

    }, err => {
        alert("位置情報の取得に失敗しました。ブラウザや端末のプライバシー設定を確認してください。");
    }, { enableHighAccuracy: true });
}

// --- アプリケーション実行 ---
main();