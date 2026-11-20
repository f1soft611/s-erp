/**
 * 카카오(구 다음) 우편번호 서비스 연동. 주소를 고르면 우편번호와 도로명 주소를 돌려준다.
 * 스크립트는 처음 검색할 때 한 번만 불러온다. 다음 도메인(t1.daumcdn.net)은 2026-11-30에 종료되므로
 * 안내된 새 도메인(t1.kakaocdn.net)을 쓴다. 서버 CSP의 script-src에도 이 도메인이 허용돼 있어야 한다.
 */
export const POSTCODE_SCRIPT_URL = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

export type PostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  bname: string;
  buildingName: string;
  apartment: string;
};

export type PostcodeSelection = { postalCode: string; address: string };

type PostcodeConstructor = new (options: { oncomplete: (data: PostcodeData) => void }) => { open: () => void };

type PostcodeWindow = Window & { daum?: { Postcode?: PostcodeConstructor } };

let loading: Promise<void> | null = null;

/** 우편번호 스크립트를 한 번만 불러온다. 실패하면 다음 호출에서 다시 시도한다. */
export function loadPostcodeScript(): Promise<void> {
  if ((window as PostcodeWindow).daum?.Postcode) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = POSTCODE_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      loading = null;
      resolve();
    };
    script.onerror = () => {
      script.remove();
      loading = null;
      reject(new Error('우편번호 검색 서비스를 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** 도로명 주소 뒤에 법정동·공동주택 건물명을 괄호로 붙인다. 도로명이 없으면 지번 주소를 쓴다. */
export function formatPostcodeAddress(data: PostcodeData): PostcodeSelection {
  const postalCode = data.zonecode || '';
  if (!data.roadAddress) return { postalCode, address: data.jibunAddress || '' };
  let extra = '';
  if (data.bname !== '' && /[동로가]$/.test(data.bname)) extra += data.bname;
  if (data.buildingName !== '' && data.apartment === 'Y') {
    extra += extra !== '' ? `, ${data.buildingName}` : data.buildingName;
  }
  return { postalCode, address: extra !== '' ? `${data.roadAddress} (${extra})` : data.roadAddress };
}

/** 검색 창을 열고, 주소를 고르면 우편번호·주소를 전달한다. 스크립트를 못 불러오면 오류를 던진다. */
export function openPostcodeSearch(onSelect: (selection: PostcodeSelection) => void): Promise<void> {
  const show = () => {
    const Postcode = (window as PostcodeWindow).daum?.Postcode;
    if (!Postcode) throw new Error('우편번호 검색 서비스를 사용할 수 없습니다.');
    new Postcode({ oncomplete: (data) => onSelect(formatPostcodeAddress(data)) }).open();
  };
  // 이미 불러왔으면 클릭과 같은 동작 안에서 바로 연다(비동기를 거치면 브라우저가 팝업을 차단할 수 있다).
  if ((window as PostcodeWindow).daum?.Postcode) {
    try { show(); return Promise.resolve(); } catch (cause) { return Promise.reject(cause); }
  }
  return loadPostcodeScript().then(show);
}
