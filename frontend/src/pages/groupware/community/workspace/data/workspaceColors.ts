const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** 컬럼 색은 #rrggbb 형식만 허용한다(저장소·화면 스타일에 임의 문자열이 들어가지 않게). */
export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX_COLOR.test(value);
