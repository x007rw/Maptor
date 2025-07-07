// --- 1. Supabaseクライアントのセットアップ ---
// 必ずSupabaseで再生成した、あなたの新しいキーに置き換えてください！
const SUPABASE_URL = 'https://thrynpdnngvnfwusyzmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocnlucGRubmd2bmZ3dXN5em1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODczNDEsImV4cCI6MjA2NzQ2MzM0MX0.JPgVeBKyE9mfzLOUoSgrhgHpewVY6nV1k4s7blZNhTQ';

// ★★★ エラー修正済み ★★★
// グローバルに存在する `supabase` オブジェクトから `createClient` を呼び出し、
// `supabaseClient` という新しい名前の定数に格納します。
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- DOM要素の取得 ---
const timerEl = document.getElementById('timer');
const radiusEl = document.getElementById('radius');
const instructionEl = document.getElementById('instruction');


// --- グローバル変数 ---
let currentCircle = null;
let map = null;


// --- イージング関数 ---
function easeOutQuad(t) {
    return t * (2 - t);
}


// --- メインアプリケーションロジック ---
async function main() {
    // 2. Supabaseから有効なイベントデータを取得
    // ★★★ エラー修正済み ★★★
    // `supabase` ではなく `supabaseClient` を使います。
    const { data: event, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_time_utc', { ascending: true })
        .limit(1)
        .single();

    if (error || !event) {
        console.error('イベントデータの取得エラー、または有効なイベントがありません:', error);
        // ユーザーに分かりやすいメッセージを表示
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
    map = L.map('map').setView([initialCenter.lat, initialCenter.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 4. 最終地点のピンを表示
    const finalCenter = { lat: event.final_lat, lng: event.final_lng };
    L.marker([finalCenter.lat, finalCenter.lng])
        .addTo(map)
        .bindPopup("🚩 最終地点")
        .openPopup();

    // 5. イベント更新ループを開始
    const totalDuration = event.duration_seconds;
    const initialRadius = event.initial_radius_m;
    const finalRadius = event.final_radius_m;
    const eventStartTime = new Date(event.start_time_utc).getTime();

    const intervalId = setInterval(() => {
        const now = Date.now();
        const elapsedTime = (now - eventStartTime) / 1000; // 秒単位

        if (elapsedTime < 0) {
            // イベント開始前: カウントダウン表示
            const waitTime = Math.abs(elapsedTime);
            const hours = Math.floor(waitTime / 3600);
            const minutes = Math.floor((waitTime % 3600) / 60);
            const seconds = Math.floor(waitTime % 60);
            timerEl.textContent = `開始まで ${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
            radiusEl.textContent = initialRadius;
            // 円はまだ表示しないか、初期位置に表示しておく
            if (!currentCircle) {
                 currentCircle = L.circle(initialCenter, { radius: initialRadius, color: "#999", fillColor: "#ccc", fillOpacity: 0.2 }).addTo(map);
            }
            return;
        }

        const progress = Math.min(elapsedTime / totalDuration, 1.0);
        const easedProgress = easeOutQuad(progress);

        const currentCenter = {
            lat: initialCenter.lat + (finalCenter.lat - initialCenter.lat) * easedProgress,
            lng: initialCenter.lng + (finalCenter.lng - initialCenter.lng) * easedProgress
        };
        const currentRadius = initialRadius - (initialRadius - finalRadius) * easedProgress;

        if (!currentCircle) {
            // イベント開始後、初めて円を描画
            currentCircle = L.circle(currentCenter, { radius: currentRadius, color: "#3498db", fillColor: "#aed6f1", fillOpacity: 0.4 }).addTo(map);
        } else {
            // 円の位置と半径、色を更新
            currentCircle.setLatLng(currentCenter);
            currentCircle.setRadius(currentRadius);
            currentCircle.setStyle({ color: "#3498db", fillColor: "#aed6f1", fillOpacity: 0.4 });
        }

        const timeLeft = Math.max(0, totalDuration - elapsedTime);
        const hours_left = Math.floor(timeLeft / 3600);
        const minutes_left = Math.floor((timeLeft % 3600) / 60);
        const seconds_left = Math.floor(timeLeft % 60);
        timerEl.textContent = `${hours_left.toString().padStart(2,'0')}:${minutes_left.toString().padStart(2,'0')}:${seconds_left.toString().padStart(2,'0')}`;
        radiusEl.textContent = Math.round(currentRadius);

        if (progress >= 1.0) {
            clearInterval(intervalId);
            instructionEl.classList.remove('hidden');
            currentCircle.setStyle({ color: "#e74c3c", fillColor: "#f5b7b1" });
        }
    }, 1000);
}

// --- アプリケーション実行 ---
main();