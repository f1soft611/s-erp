/**
 * 금액을 한글로 바꾼다. 예: 392700 → "삼십구만이천칠백원 정".
 * 안전한 정수가 아니면 잘못된 한글 금액을 쓰지 않도록 빈 문자열을 돌려준다.
 * 0은 "영원 정", 음수는 "마이너스 …"로 쓴다. (영업 거래명세표의 변환 규칙과 같다.)
 */
export function amountInKorean(value: number): string {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return '';
  if (number === 0) return '영원 정';
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const units = ['', '십', '백', '천'];
  const groups = ['', '만', '억', '조'];
  let rest = Math.abs(number);
  let result = '';
  for (let group = 0; rest > 0; group += 1) {
    let part = rest % 10000;
    rest = Math.floor(rest / 10000);
    let word = '';
    for (let place = 0; part > 0; place += 1) {
      const digit = part % 10;
      part = Math.floor(part / 10);
      if (digit) word = (digit === 1 && place > 0 ? '' : digits[digit]) + units[place] + word;
    }
    if (word) result = word + groups[group] + result;
  }
  return `${number < 0 ? '마이너스 ' : ''}${result}원 정`;
}
