import { useEffect } from 'react';
import { dismissBootSplash } from '../bootSplash';

/** 이 컴포넌트가 커밋되면 앱 화면이 준비된 것이므로 부팅 스플래시를 제거한다. */
export function BootSplashReady() {
  useEffect(() => {
    dismissBootSplash();
  }, []);

  return null;
}
