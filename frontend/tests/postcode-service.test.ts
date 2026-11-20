import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatPostcodeAddress,
  openPostcodeSearch,
  POSTCODE_SCRIPT_URL,
  type PostcodeData,
} from '../src/shared/services/postcode';

const base: PostcodeData = {
  zonecode: '13529', roadAddress: '경기 성남시 분당구 판교역로 166', jibunAddress: '경기 성남시 분당구 백현동 532',
  bname: '', buildingName: '', apartment: 'N',
};

describe('우편번호 서비스', () => {
  afterEach(() => {
    delete (window as unknown as { daum?: unknown }).daum;
    document.head.querySelectorAll('script').forEach((script) => script.remove());
  });

  it('새 카카오 도메인을 쓴다(다음 도메인은 2026-11-30 종료)', () => {
    expect(POSTCODE_SCRIPT_URL).toContain('t1.kakaocdn.net');
    expect(POSTCODE_SCRIPT_URL).not.toContain('daumcdn');
  });

  it('도로명 주소 뒤에 법정동과 공동주택 건물명을 괄호로 붙인다', () => {
    expect(formatPostcodeAddress(base)).toEqual({ postalCode: '13529', address: '경기 성남시 분당구 판교역로 166' });
    expect(formatPostcodeAddress({ ...base, bname: '백현동' }).address).toBe('경기 성남시 분당구 판교역로 166 (백현동)');
    expect(formatPostcodeAddress({ ...base, bname: '백현동', buildingName: '봇들마을', apartment: 'Y' }).address)
      .toBe('경기 성남시 분당구 판교역로 166 (백현동, 봇들마을)');
    expect(formatPostcodeAddress({ ...base, buildingName: '봇들마을', apartment: 'Y' }).address)
      .toBe('경기 성남시 분당구 판교역로 166 (봇들마을)');
    expect(formatPostcodeAddress({ ...base, bname: '백현리' }).address).toBe('경기 성남시 분당구 판교역로 166');
  });

  it('도로명 주소가 없으면 지번 주소를 쓴다', () => {
    expect(formatPostcodeAddress({ ...base, roadAddress: '' }).address).toBe('경기 성남시 분당구 백현동 532');
  });

  it('스크립트를 불러온 뒤 검색 창을 열고 선택 결과를 전달한다', async () => {
    const open = vi.fn();
    let complete: (data: PostcodeData) => void = () => undefined;
    class FakePostcode {
      constructor(options: { oncomplete: (data: PostcodeData) => void }) { complete = options.oncomplete; }
      open() { open(); }
    }
    const onSelect = vi.fn();
    const pending = openPostcodeSearch(onSelect);
    const script = document.head.querySelector<HTMLScriptElement>(`script[src="${POSTCODE_SCRIPT_URL}"]`);
    expect(script).not.toBeNull();
    (window as unknown as { daum: unknown }).daum = { Postcode: FakePostcode };
    script?.onload?.(new Event('load'));
    await pending;
    expect(open).toHaveBeenCalledTimes(1);
    complete(base);
    expect(onSelect).toHaveBeenCalledWith({ postalCode: '13529', address: '경기 성남시 분당구 판교역로 166' });
  });

  it('이미 불러온 뒤에는 클릭과 같은 동작 안에서 바로 검색 창을 연다(팝업 차단 방지)', () => {
    const open = vi.fn();
    class FakePostcode { open() { open(); } }
    (window as unknown as { daum: unknown }).daum = { Postcode: FakePostcode };
    void openPostcodeSearch(vi.fn());
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('스크립트를 못 불러오면 안내 문구로 실패하고 다시 시도할 수 있다', async () => {
    const first = openPostcodeSearch(vi.fn());
    const script = document.head.querySelector<HTMLScriptElement>('script');
    script?.onerror?.(new Event('error'));
    await expect(first).rejects.toThrow('우편번호 검색 서비스를 불러오지 못했습니다');
    const second = openPostcodeSearch(vi.fn());
    expect(document.head.querySelectorAll('script')).toHaveLength(1);
    document.head.querySelector<HTMLScriptElement>('script')?.onerror?.(new Event('error'));
    await expect(second).rejects.toThrow();
  });
});
