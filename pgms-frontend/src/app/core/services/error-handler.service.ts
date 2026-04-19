import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  getErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.status === 0) {
      return 'Unable to reach the PGMS server. Please verify that the backend is running.';
    }

    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to access this page.';
    }

    return error.message || 'Something went wrong. Please try again.';
  }

  handleHttpError(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.authService.clearSession();
      void this.router.navigate(['/auth/login'], {
        queryParams: { reason: 'session-expired' }
      });
    }
  }
}
