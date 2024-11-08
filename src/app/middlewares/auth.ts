import { Response, Request, NextFunction } from 'express'
import ApiError from '../../errors/ApiError'
import config from '../../config'
import { Secret } from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'
import { jwtHelper } from '../../helpers/jwtHelper'

export const auth =
  (...requiredRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization
      if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized!')
      }

      const verifiedUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret
      )
      if (!verifiedUser) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token')
      }
      req.user = verifiedUser
      if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Forbidden!')
      }
      next()
    } catch (error) {
      next(error)
    }
  }
