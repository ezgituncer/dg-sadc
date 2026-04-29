import { HttpInterceptorFn } from '@angular/common/http';
import { map } from 'rxjs';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && (v as object).constructor === Object;

const snakeToCamel = (s: string): string =>
  s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const camelToSnake = (s: string): string =>
  s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const transformKeys = (input: unknown, fn: (k: string) => string): unknown => {
  if (Array.isArray(input)) return input.map((item) => transformKeys(item, fn));
  if (!isPlainObject(input)) return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[fn(k)] = transformKeys(v, fn);
  }
  return out;
};

export const caseInterceptor: HttpInterceptorFn = (req, next) => {
  // Outgoing: camelCase → snake_case (body + params)
  let outReq = req;
  if (req.body && (isPlainObject(req.body) || Array.isArray(req.body))) {
    outReq = outReq.clone({ body: transformKeys(req.body, camelToSnake) });
  }

  return next(outReq).pipe(
    map((event) => {
      // Incoming: snake_case → camelCase (response body)
      if (event.type === 4 /* HttpEventType.Response */ && (event as any).body !== undefined) {
        const body = (event as any).body;
        if (body && (isPlainObject(body) || Array.isArray(body))) {
          return (event as any).clone({ body: transformKeys(body, snakeToCamel) });
        }
      }
      return event;
    }),
  );
};
