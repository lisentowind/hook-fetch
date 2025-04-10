/**
 * TODO: 支持 static 方法
 * TODO: 支持请求重试 (hook 中实现)
 */

import type { AnyObject } from "typescript-api-pro";
import { type BaseOptions, type BaseRequestOptions, type HookFetchPlugin, type RequestUseOptions } from "./types";
import { HookFetch, mergeHeaders } from "./utils";

const request = <R, P, D, E>(options: BaseRequestOptions<P, D>): HookFetch<R, E> => {
  return new HookFetch<R, E>(options);
}

class Base {
  #timeout: number;
  #baseURL: string;
  #commonHeaders: HeadersInit;
  #queue: Array<AbortController> = [];
  #plugins: Array<HookFetchPlugin> = [];
  #withCredentials: boolean;

  constructor({ timeout = 0, baseURL = '', headers = {}, plugins = [], withCredentials = false }: BaseOptions) {
    this.#timeout = timeout;
    this.#baseURL = baseURL;
    this.#commonHeaders = headers;
    this.#plugins = plugins;
    this.#withCredentials = withCredentials;
  }

  // eslint-disable-next-line no-explicit-any
  use(plugin: HookFetchPlugin<any, any, any, any>) {
    this.#plugins.push(plugin);
    return this;
  }

  request<R = AnyObject, P = AnyObject, D = AnyObject, E = AnyObject>(url: string, { timeout, headers, method = 'GET', params, data, qsArrayFormat, withCredentials, extra }: RequestUseOptions<P, D, E> = {}) {
    const controller = new AbortController();
    this.#queue.push(controller);
    const req = request<R, P, D, E>({
      url,
      baseURL: this.#baseURL,
      timeout: timeout ?? this.#timeout,
      plugins: this.#plugins,
      headers: mergeHeaders(this.#commonHeaders, headers),
      controller,
      method,
      params,
      data,
      qsArrayFormat,
      withCredentials: withCredentials ?? this.#withCredentials,
      extra: extra as AnyObject
    })
    req.finally(() => {
      this.#queue = this.#queue.filter(item => item !== controller);
    })
    return req;
  }

  #requestWithParams<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options: Omit<RequestUseOptions<P, never, E>, 'params'> = {}) {
    return this.request<R, P, never, E>(url, { ...options, params })
  }

  #requestWithBody<R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data: D = {} as D, options: Omit<RequestUseOptions<P, D, E>, 'data'> = {}) {
    return this.request<R, P, D, E>(url, { ...options, data })
  }

  get<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: Omit<RequestUseOptions<P, never, E>, 'params'>) {
    return this.#requestWithParams<R, P, E>(url, params, options)
  }

  head<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: Omit<RequestUseOptions<P, never, E>, 'params'>) {
    return this.#requestWithParams<R, P, E>(url, params, options)
  }

  options<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, params: P = {} as P, options?: Omit<RequestUseOptions<P, never, E>, 'params'>) {
    return this.#requestWithParams<R, P, E>(url, params, options)
  }

  delete<R = AnyObject, P = AnyObject, E = AnyObject>(url: string, options?: RequestUseOptions<P, never, E>) {
    return this.request<R, P, never, E>(url, options)
  }

  post<R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: Omit<RequestUseOptions<P, D, E>, 'data'>) {
    return this.#requestWithBody<R, D, P, E>(url, data, options)
  }

  put<R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: Omit<RequestUseOptions<P, D, E>, 'data'>) {
    return this.#requestWithBody<R, D, P, E>(url, data, options)
  }

  patch<R = AnyObject, D = AnyObject, P = AnyObject, E = AnyObject>(url: string, data?: D, options?: Omit<RequestUseOptions<P, D, E>, 'data'>) {
    return this.#requestWithBody<R, D, P, E>(url, data, options)
  }

  abortAll() {
    this.#queue.forEach(controller => controller.abort());
    this.#queue = [];
  }
}

const useRequest = <R = AnyObject, P = AnyObject, D = AnyObject, E = AnyObject>(url: string, options: RequestUseOptions<P, D, E> = {}) => request<R, P, D, E>({
  url,
  baseURL: '',
  ...options
} as BaseRequestOptions<P, D>)

type ExportDefault = typeof useRequest & {
  create: (options: BaseOptions) => Base
}
const defaultFn = useRequest;
(defaultFn as (typeof useRequest & { create: (options: BaseOptions) => Base })).create = (options: BaseOptions) => new Base(options);

export default defaultFn as ExportDefault;
