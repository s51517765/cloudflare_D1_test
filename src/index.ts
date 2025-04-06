import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export interface Env {
  DB: D1Database;
  ASSETS: {
    fetch: (request: Request, init?: RequestInit) => Promise<Response>;
    get: (key: string) => Promise<string | null>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname, searchParams } = new URL(request.url);

    if (pathname === "/api/beverages") {
      // URLのクエリパラメータからCompanyNameを取得
      const companyName = searchParams.get("companyName");

      // companyNameパラメータが存在しない場合のエラー処理
      if (!companyName) {
        return new Response(
          JSON.stringify({ error: "'companyName' パラメータがありません" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      try {
        // データベースクエリを実行
        const { results } = await env.DB.prepare(
          "SELECT * FROM Customers WHERE CompanyName = ?"
        )
          .bind(companyName) // クエリパラメータの値をバインド
          .all();

        // CORSヘッダーを設定 (本番環境ではOriginを限定してください)
        const headers = {
          "Content-Type": "application/json",
          //"Access-Control-Allow-Origin": "*", // 本番環境ではOriginを限定、「*」にするとローカルではどこからでもアクセス可能、制御効いていない？
          "Access-Control-Allow-Methods": "GET, OPTIONS", // 今回はGETのみ
          "Access-Control-Allow-Headers": "Content-Type",
        };

        return new Response(JSON.stringify(results), { headers });
      } catch (error: any) {
        // エラー処理
        console.error("データ取得エラー:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else if (pathname === "/") {
      // トップページへのアクセス
      try {
        const indexHTML = await env.ASSETS.get("index.html");
        if (indexHTML) {
          // index.html の内容をレスポンスとして返す
          return new Response(indexHTML, {
            headers: { "Content-Type": "text/html" },
          });
        } else {
          return new Response("index.html not found", { status: 404 });
        }
      } catch (e: any) {
        console.error("Error reading index.html:", e); // エラーログを追加
        return new Response("index.html not found", { status: 404 }); // 404 を返す
      }
    }

    // /api/beverages以外のURLへのアクセス
    return new Response(
      "特定の会社の情報を表示するには、/api/beverages?companyName=[会社名] を呼び出してください。",
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        },
      }
    );
  }
}