// HTMLをnote.com用のテキスト形式に変換
export function convertToNoteFormat(html: string): string {
  // 一時的なdiv要素を作成してHTMLをパース
  const div = document.createElement("div");
  div.innerHTML = html;

  let result = "";

  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map(processNode).join("");

    switch (tagName) {
      case "h1":
        // H1はタイトルとして別扱い（noteでは記事タイトルに入力）
        return `【タイトル】\n${children}\n\n`;
      case "h2":
        return `\n■ ${children}\n\n`;
      case "h3":
        return `\n▼ ${children}\n\n`;
      case "p":
        return `${children}\n\n`;
      case "ul":
      case "ol":
        return `${children}\n`;
      case "li":
        return `・${children}\n`;
      case "strong":
      case "b":
        return children;
      case "em":
      case "i":
        return children;
      case "a":
        const href = element.getAttribute("href");
        return href ? `${children}（${href}）` : children;
      case "br":
        return "\n";
      case "div":
      case "span":
      case "section":
      case "article":
        return children;
      default:
        return children;
    }
  };

  result = Array.from(div.childNodes).map(processNode).join("");

  // 連続する空行を2つまでに制限
  result = result.replace(/\n{3,}/g, "\n\n");

  // 先頭と末尾の空白を削除
  result = result.trim();

  return result;
}

// note.com用にHTMLを整形（h1除去、不要タグ除去）
export function convertToNoteHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  // h1を除去（noteではタイトル欄に入力するため）
  const h1 = div.querySelector("h1");
  if (h1) h1.remove();

  // note非対応タグをシンプル化
  div.querySelectorAll("span, div, section, article").forEach((el) => {
    el.replaceWith(...Array.from(el.childNodes));
  });

  return div.innerHTML.trim();
}

// HTMLをリッチテキストとしてクリップボードにコピー（note用）
export async function copyHtmlToClipboard(html: string, fallbackText: string): Promise<void> {
  try {
    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([fallbackText], { type: "text/plain" });
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]);
  } catch {
    // フォールバック: プレーンテキストのみ
    await navigator.clipboard.writeText(fallbackText);
  }
}

// テキストをクリップボードにコピー（ブラウザ用）
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
