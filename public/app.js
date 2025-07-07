// --- 1. Supabaseクライアントのセットアップ ---
// (ここは変更なし)
const SUPABASE_URL = 'https://thrynpdnngvnfwusyzmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocnlucGRubmd2bmZ3dXN5em1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODczNDEsImV4cCI6MjA2NzQ2MzM0MX0.JPgVeBKyE9mfzLOUoSgrhgHpewVY6nV1k4s7blZNhTQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- DOM要素の取得 ---
// (ここは変更なし)
const timerEl = document.getElementById('timer');
const radiusEl = document.getElementById('radius');
const instructionEl = document.getElementById('instruction');


// --- グローバル変数 ---
// (ここは変更なし)
let currentCircle = null;
let map = null;


// --- イージング関数 ---
// (ここは変更なし)
function easeOutQuad(t) {
    return t * (2 - t);
}


// --- メインアプリケーションロジック ---
async function main() {
    // 2. Supabaseから有効なイベントデータを取得 (変更なし)
    const { data: event, error } = await supabaseClient
        .from('events')
    // ... (以下、取得ロジックは省略) ...
    // (取得ロジックは元のままでOKです)

    // (イベントがない場合の表示も元のままでOKです)

    // 3. 地図の初期化 (変更なし)
    const initialCenter = { lat: event.initial_lat, lng: event.initial_lng };
    map = L.map('map').setView([initialCenter.lat, initialCenter.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // ★★★ ここからが追加部分 ★★★
    // GPSボタンのセットアップ処理を呼び出す
    setupGpsButton();
    // ★★★ ここまでが追加部分 ★★★

    // 4. 最終地点のピンを表示 (変更なし)
    const finalCenter = { lat: event.final_lat, lng: event.final_lng };
    L.marker([finalCenter.lat, finalCenter.lng])
    // ... (以下、ピン表示ロジックは省略) ...

    // 5. イベント更新ループを開始 (変更なし)
    // ... (ループのロジックは元のままでOKです) ...
}


// ★★★ ここからが追加部分 ★★★
// --- GPSボタンのセットアップとロジック ---
function setupGpsButton() {
    const gpsButton = document.getElementById('gps-button');
    let userMarker = null;
    let isTracking = false; // 追跡中かどうかのフラグ
    let watchId = null; // watchPositionのID

    gpsButton.addEventListener('click', () => {
        if (!map) return; // 地図がなければ何もしない

        // 追跡中なら停止する
        if (isTracking) {
            navigator.geolocation.clearWatch(watchId);
            if (userMarker) map.removeLayer(userMarker);
            userMarker = null;
            isTracking = false;
            gpsButton.style.backgroundColor = 'white';
            return;
        }

        if (!("geolocation" in navigator)) {
            alert("この端末は位置情報に対応していません");
            return;
        }

        gpsButton.disabled = true; // 処理中は無効化

        // watchPositionで位置情報を継続的に監視
        watchId = navigator.geolocation.watchPosition(position => {
            const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };

            if (!userMarker) {
                // 初回のみマーカーを作成
                userMarker = L.marker(userPos).addTo(map).bindPopup("あなたはここにいます");
                map.setView(userPos, 15); // 初回はユーザー位置にズーム
            } else {
                userMarker.setLatLng(userPos);
            }
            isTracking = true;
            gpsButton.style.backgroundColor = '#c7e6fd'; // 追跡中は色を変える
            gpsButton.disabled = false; // 有効化
        },
            err => {
                alert("位置情報の取得に失敗しました。ブラウザや端末のプライバシー設定を確認してください。");
                gpsButton.disabled = false;
            },
            { enableHighAccuracy: true });
    });
}
// ★★★ ここまでが追加部分 ★★★


// --- アプリケーション実行 ---
main();