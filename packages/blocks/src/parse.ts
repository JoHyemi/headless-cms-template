import { defaultBlocks } from "./types";
import type { Block } from "./types";
import { isBlockArray } from "./normalize";

/**
 * DB(Postgres Json 컬럼)에서 읽은 content 값을 블록 배열로 정규화합니다.
 * Postgres의 Json 컬럼은 Prisma가 이미 파싱된 값으로 돌려주므로(문자열이 아님),
 * JSON.parse나 구버전 SQLite 시절의 순수 텍스트 하위호환 변환은 더 이상 필요하지 않습니다.
 */
export function parseContent(value: unknown): Block[] {
  return isBlockArray(value) ? value : defaultBlocks();
}
