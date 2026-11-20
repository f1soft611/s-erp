export type MyProfile = {
  userId: string;
  employeeId: number | string;
  name?: string | null;
  email?: string | null;
  departmentName?: string | null;
  levelName?: string | null;
  profileImage?: string | null;
  stampImage?: string | null;
  /** 사원 마스터의 사번·직위(읽기 전용). */
  employeeNo?: string | null;
  positionNm?: string | null;
  /** false이면 사진 변경이 정책상 관리자 전용이다(없으면 변경 가능으로 본다). */
  photoEditable?: boolean;
};

export type UpdateMyProfilePayload = {
  email: string;
  profileImage?: string | null;
  stampImage?: string | null;
};

export type ChangeMyPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
};
