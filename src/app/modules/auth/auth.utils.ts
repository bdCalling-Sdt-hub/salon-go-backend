import { Secret } from "jsonwebtoken";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import { Types } from "mongoose";
import { USER_ROLES } from "../../../enums/user";

export const createTokens = (authId: Types.ObjectId, customerId: Types.ObjectId) => {
    const accessToken = jwtHelper.createToken(
      { id: authId, userId: customerId ,role:USER_ROLES.USER },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );
  
    const refreshToken = jwtHelper.createToken(
      { id: authId, userId: customerId ,role:USER_ROLES.USER},
      config.jwt.jwt_refresh_secret as Secret,
      config.jwt.jwt_refresh_expire_in as string,
     
    );
  
    return { accessToken, refreshToken, role:USER_ROLES.USER };
  };