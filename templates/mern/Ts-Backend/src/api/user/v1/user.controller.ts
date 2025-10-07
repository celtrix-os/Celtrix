// Your all User Controller Code Goes Here
import { Request, Response } from 'express';

import { ErrorType, SendResponse } from '../../../utils/SendResponse.utils';
import userUtils from './user.utils';

class UserController {
  async getUser(req: Request, res: Response) {
    try {
      const finUser = await userUtils.FIND_USER_BY_ID();
      SendResponse.success(res, 'Find User', finUser ,  200);
    } catch (error: unknown) {
      console.log(error);
      SendResponse.error(res, error as ErrorType);
    }
  }
}

export default new UserController();
