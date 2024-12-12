export type IGenericResponse<T> = {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
    currentPage?: number;
    numberOfPages?: number;
  };
  data: T;
};

export type IRefreshTokenResponse = {
  accessToken: string;
};

export type ILoginResponse = {
  accessToken: string;
  refreshToken: string;
};
