import type { CustomBlockComponents } from "../BlockRenderer";
import type { CustomBlockHtmlRenderers } from "../html";
import { CtaButton, ctaButtonToHtml } from "./ctaButton";

// 実際に動くカスタムブロックのレンダラー登録例。管理画面(/block-types)で
// slugが"cta-button"のブロックタイプを作成すると、ここに登録されたデザインで描画されます。
// 新しいカスタムブロックのデザインを追加する場合は、この2つのオブジェクトに
// (ブロックタイプのslug) -> (レンダラー) のペアを増やしていきます。
export const PRESET_CUSTOM_COMPONENTS: CustomBlockComponents = {
  "cta-button": CtaButton,
};

export const PRESET_CUSTOM_HTML_RENDERERS: CustomBlockHtmlRenderers = {
  "cta-button": ctaButtonToHtml,
};
