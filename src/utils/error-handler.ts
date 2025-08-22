import { Request, Response, NextFunction } from "express";
import { ErrorCode, HttpException } from "~/exceptions/root";
import { InternalServerException } from "~/exceptions/internal-server";

export const errorHandler = (method: Function) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await method(req, res, next);
        } catch (error: any) {
            let exception: HttpException;
            if (error instanceof HttpException) {
                exception = error;
            } else {
                exception = new InternalServerException(
                    "Something went wrong!",
                    ErrorCode.INTERNAL_SERVER_ERROR,
                    error,
                );
            }
            next(exception);
        }
    };
};
