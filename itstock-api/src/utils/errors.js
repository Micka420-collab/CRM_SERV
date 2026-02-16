class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ressource non trouvee') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Non autorise') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acces interdit') {
    super(message, 403, 'FORBIDDEN');
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Requete invalide', errorCode = 'BAD_REQUEST') {
    super(message, 400, errorCode);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflit', errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError
};
