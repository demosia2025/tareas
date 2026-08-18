import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Convertir recursivamente todos los BigInt a Number
        return this.convertBigIntToNumber(data);
      }),
    );
  }

  private convertBigIntToNumber(obj: any): any {
    if (typeof obj === 'bigint') {
      return Number(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertBigIntToNumber(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.convertBigIntToNumber(obj[key]);
      }
      return result;
    }
    
    return obj;
  }
}