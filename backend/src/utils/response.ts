import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any, message: string = 'Success', statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static badRequest(res: Response, message: string = 'Bad Request') {
    return res.status(400).json({
      success: false,
      error: message,
    });
  }

  static unauthorized(res: Response, message: string = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      error: message,
    });
  }

  static forbidden(res: Response, message: string = 'Forbidden') {
    return res.status(403).json({
      success: false,
      error: message,
    });
  }

  static notFound(res: Response, message: string = 'Not Found') {
    return res.status(404).json({
      success: false,
      error: message,
    });
  }

  static serverError(res: Response, message: string = 'Internal Server Error') {
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}