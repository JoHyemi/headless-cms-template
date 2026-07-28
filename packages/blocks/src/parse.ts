import { defaultBlocks } from "./types";
import type { Block } from "./types";
import { isBlockArray } from "./normalize";

/**
 * DB(PostgresのJsonカラム)から読み込んだcontentの値をブロック配列に正規化します。
 * PostgresのJsonカラムはPrismaがすでにパース済みの値として返すため(文字列ではない)、
 * JSON.parseや旧SQLite時代のプレーンテキスト互換変換はもう必要ありません。
 */
export function parseContent(value: unknown): Block[] {
  return isBlockArray(value) ? value : defaultBlocks();
}
