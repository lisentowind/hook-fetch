import type QueryString from "qs";
import qs from "qs";
import { omit } from "radash";
import type { AnyObject } from "typescript-api-pro";
import { ContentType, HookFetchPlugin, StatusCode, type BaseRequestOptions, type OnFinallyHandler, type RequestConfig, type RequestMethod, type RequestMethodWithBody, type RequestMethodWithParams, type ResponseErrorOptions, type StreamContext } from "./types";

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const timeoutCallback = (controller: AbortController) => {
  controller.abort();
}

export class ResponseError<E = unknown> extends Error {
  #message: string;
  #name: string;
  #status?: number;
  #statusText?: string;
  #response?: Response;
  #config?: RequestConfig<unknown, unknown, E>;

  constructor({ message, status, statusText, response, config, name }: ResponseErrorOptions<E>) {
    super(message);
    this.#message = message;
    this.#status = status;
    this.#statusText = statusText;
    this.#response = response;
    this.#config = config;
    this.#name = name ?? message;
  }

  get message() {
    return this.#message;
  }
  get status() {
    return this.#status;
  }
  get statusText() {
    return this.#statusText;
  }
  get response() {
    return this.#response;
  }
  get config() {
    return this.#config;
  }
  get name() {
    return this.#name;
  }
}

export const parsePlugins = (plugins: HookFetchPlugin[]) => {
  const pluginsSet = new Set<HookFetchPlugin>();
  plugins.forEach(plugin => {
    pluginsSet.add(plugin);
  })
  const pluginsArr = Array.from(pluginsSet).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const beforeRequestPlugins: Array<Exclude<HookFetchPlugin['beforeRequest'], undefined>> = [];
  const afterResponsePlugins: Array<Exclude<HookFetchPlugin['afterResponse'], undefined>> = [];
  const errorPlugins: Array<Exclude<HookFetchPlugin['onError'], undefined>> = [];
  const finallyPlugins: Array<Exclude<HookFetchPlugin['onFinally'], undefined>> = [];
  const transformStreamChunkPlugins: Array<Exclude<HookFetchPlugin['transformStreamChunk'], undefined>> = [];
  pluginsArr.forEach(plugin => {
    if (plugin.beforeRequest) {
      beforeRequestPlugins.push(plugin.beforeRequest);
    }
    if (plugin.afterResponse) {
      afterResponsePlugins.push(plugin.afterResponse);
    }
    if (plugin.onError) {
      errorPlugins.push(plugin.onError);
    }
    if (plugin.onFinally) {
      finallyPlugins.push(plugin.onFinally);
    }
    if (plugin.transformStreamChunk) {
      transformStreamChunkPlugins.push(plugin.transformStreamChunk);
    }
  })
  return {
    beforeRequestPlugins,
    afterResponsePlugins,
    errorPlugins,
    finallyPlugins,
    transformStreamChunkPlugins
  }
}

// 处理响应数据
// export class ResponseWithSourceClass<E> {
//   #response: Response;
//   #plugins: ReturnType<typeof parsePlugins>;
//   #controller: AbortController;
//   #config: RequestConfig<unknown, unknown, E>;
//   constructor({ response, plugins, config, controller }: ResponseWithSourceClassOptions<E>) {
//     this.#response = response;
//     this.#plugins = parsePlugins(plugins);
//     this.#controller = controller;
//     this.#config = config;
//   }

//   get $as() {
//     // eslint-disable-next-line no-this-alias
//     const _this = this;
//     return {
//       blob: () => this.#response.clone().blob(),
//       text: () => this.#response.clone().text(),
//       arrayBuffer: () => this.#response.clone().arrayBuffer(),
//       formData: () => this.#response.clone().formData(),
//       bytes: () => this.#response.clone().bytes(),
//       async *stream<T>() {
//         const reader = _this.#response.clone().body?.getReader();
//         if (!reader) {
//           return;
//         }
//         while (true) {
//           const { done, value } = await reader.read();
//           if (done) {
//             break;
//           }
//           let res: StreamContext = {
//             source: value,
//             result: value,
//             error: null
//           };
//           try {
//             for (const plugin of _this.#plugins.transformStreamChunkPlugins) {
//               res = await plugin(res);
//             }
//             yield res as StreamContext<T>;
//           } catch (error) {
//             res.error = error;
//             res.result = null;
//             yield res as StreamContext<null>;
//           }
//         }
//       }
//     };
//   }

//   get json() {
//     return new Promise((resolve, reject) => {
//       this.#response.clone().json().then(async (rawJson) => {
//         let res: FetchPluginContext = {
//           config: this.#config,
//           response: this.#response,
//           result: rawJson,
//           controller: this.#controller
//         }
//         try {
//           for (const plugin of this.#plugins.afterResponsePlugins) {
//             res = await plugin(res)
//           }
//           resolve(res.result)
//         } catch (error) {
//           reject(error)
//         }
//       });
//     })
//   }

//   $abort() {
//     this.#controller.abort();
//   }
// }

export const buildUrl = (url: string, params?: AnyObject, qsArrayFormat: QueryString.IStringifyOptions['arrayFormat'] = "repeat"): string => {
  if (params) {
    const paramsStr = qs.stringify(params, { arrayFormat: qsArrayFormat });
    if (paramsStr) {
      url = url.includes('?') ? `${url}&${paramsStr}` : `${url}?${paramsStr}`;
    }
  }
  return url;
}

export const mergeHeaders = (_baseHeaders: HeadersInit | Headers = {}, _newHeaders: HeadersInit | Headers = {}): Headers => {
  const _result = _baseHeaders instanceof Headers ? _baseHeaders : new Headers(_baseHeaders);
  const combineHeaders = (_headers: HeadersInit | Headers) => {
    if (!(_headers instanceof Headers)) {
      _headers = new Headers(_headers);
    }
    _headers.forEach((value, key) => {
      _result.set(key, value);
    });
  }
  combineHeaders(_newHeaders);
  return _result;
}

const withBodyArr: RequestMethodWithBody[] = ['PATCH', 'POST', 'PUT'];
const withoutBodyArr: RequestMethodWithParams[] = ['GET', 'HEAD', 'OPTIONS', 'DELETE'];

export const getBody = (body: AnyObject, method: RequestMethod, headers?: HeadersInit, qsArrayFormat: QueryString.IStringifyOptions['arrayFormat'] = 'repeat'): BodyInit | null => {
  if (!body) return null;
  let res: BodyInit | null = null;
  if (withBodyArr.includes(method.toUpperCase() as RequestMethodWithBody)) {
    const _headers_: Headers = new Headers(headers || {});
    const _contentType = _headers_.get('Content-Type') || '';
    if (_contentType.includes(ContentType.JSON)) {
      res = JSON.stringify(body);
    } else if (_contentType.includes(ContentType.FORM_URLENCODED)) {
      res = qs.stringify(body, { arrayFormat: qsArrayFormat, });
    } else if (_contentType.includes(ContentType.FORM_DATA)) {
      const formData = new FormData();
      if (!(body instanceof FormData) && typeof body === 'object') {
        const _data = body as AnyObject;
        Object.keys(_data).forEach((key) => {
          if (_data.prototype.hasOwnProperty.call(key)) {
            formData.append(key, _data[key]);
          }
        });
        res = formData;
      }
    }
  }
  if (withoutBodyArr.includes(method.toUpperCase() as RequestMethodWithParams)) {
    res = null;
  }
  return res;
}

// TODO: 优化then和catch的链式调用->应该返回promiseLike
export class HookFetch<T, E> implements PromiseLike<T> {
  #plugins: ReturnType<typeof parsePlugins>;
  #controller: AbortController;
  #config: RequestConfig<unknown, unknown, E>;
  #promise: Promise<Response>;
  #isTimeout: boolean = false;

  constructor(options: BaseRequestOptions<unknown, unknown, E>) {
    const { plugins = [], controller, url, baseURL = '', params, data, qsArrayFormat = 'repeat', withCredentials, extra, method = 'GET', headers } = options;
    this.#controller = controller ?? new AbortController();
    this.#plugins = parsePlugins(plugins);
    this.#config = {
      url,
      baseURL,
      params,
      data,
      withCredentials,
      extra,
      method,
      headers,
      qsArrayFormat
    }
    // const { promise } = this.#createRequest(options);
    // this.#promise = promise as Promise<Response>;
    this.#promise = this.#init(options);
  }

  #init({ timeout }: BaseRequestOptions<unknown, unknown, E>) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<Response>(async (resolve, reject) => {
      let config = this.#config;
      const { beforeRequestPlugins } = this.#plugins;
      for (const plugin of beforeRequestPlugins) {
        config = (await plugin(config)) as RequestConfig<unknown, unknown, E>;
      }

      const _url_ = buildUrl(config.baseURL + config.url, config.params as AnyObject, config.qsArrayFormat);

      const body = getBody(config.data as AnyObject, config.method, config.headers, config.qsArrayFormat);

      const otherOptions = omit(config ?? {}, ['baseURL', 'data', 'extra', 'headers', 'method', 'params', 'url', 'withCredentials']);

      const options: RequestInit = {
        ...otherOptions,
        method: config.method,
        headers: config.headers,
        signal: this.#controller.signal,
        credentials: config.withCredentials ? 'include' : 'omit',
        body
      };

      const req = fetch(_url_, options);
      let promises: Array<Promise<Response | void>> = [req];
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (timeout) {
        const timeoutPromise = new Promise<void>((_) => {
          timeoutId = setTimeout(() => {
            this.#isTimeout = true;
            this.#controller?.abort();
          }, timeout)
        })
        promises.push(timeoutPromise)
      }

      try {
        const res = await Promise.race(promises);
        if (res) {
          if (res.ok) {
            resolve(res)
          }
          return reject(new ResponseError({
            message: 'Fail Request',
            status: res.status,
            statusText: res.statusText,
            config: this.#config,
            name: 'Fail Request'
          }))
        }
        return reject(new ResponseError({
          message: 'NETWORK_ERROR',
          status: StatusCode.NETWORK_ERROR,
          statusText: 'Network Error',
          config: this.#config,
          name: 'Network Error'
        }))
      } catch (error) {
        reject(await this.#normalizeError(error))
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    })
  }

  async #createNormalizeError(error: unknown): Promise<ResponseError> {
    if (error instanceof ResponseError) return error;

    if (error instanceof TypeError) {
      if (error.name === 'AbortError') {
        if (this.#isTimeout) {
          return new ResponseError({
            message: 'Request timeout',
            status: StatusCode.TIME_OUT,
            statusText: 'Request timeout',
            config: this.#config,
            name: 'Request timeout',
            response: await this.#response
          })
        } else {
          return new ResponseError({
            message: 'Request aborted',
            status: StatusCode.ABORTED,
            statusText: 'Request aborted',
            config: this.#config,
            name: 'Request aborted',
            response: await this.#response
          })
        }
      }
      return new ResponseError({
        message: error.message,
        status: StatusCode.NETWORK_ERROR,
        statusText: "Unknown Request Error",
        config: this.#config,
        name: error.name,
        response: await this.#response
      });
    }

    return new ResponseError({
      message: (error as Error)?.message ?? "Unknown Request Error",
      status: StatusCode.UNKNOWN,
      statusText: "Unknown Request Error",
      config: this.#config,
      name: 'Unknown Request Error',
      response: await this.#response
    })
  }

  async #normalizeError(error: unknown): Promise<ResponseError> {
    let err = await this.#createNormalizeError(error);
    for (const plugin of this.#plugins.errorPlugins) {
      err = await plugin(err) as ResponseError<E>;
    }
    return err
  }

  get #json() {
    return new Promise<T>((resolve, reject) => {
      this.#response.then(r => r.json()).then(async res => {
        let result = res;
        for (const plugin of this.#plugins.afterResponsePlugins) {
          result = await plugin(result)
        }
        resolve(result)
      }).catch(async err => {
        reject(await this.#normalizeError(err))
      }).finally(async () => {
        const options: Parameters<OnFinallyHandler>[0] = {
          config: this.#config,
          response: await this.#response.then(r => r.clone())
        }
        for (const plugin of this.#plugins.finallyPlugins) {
          plugin(options)
        }
      })
    })
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
  ): PromiseLike<TResult1 | TResult2> {
    return this.#json.then(onfulfilled, onrejected)
  }

  // 没有走插件错误处理x
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined
  ): Promise<T | TResult> {
    return this.#json.catch(onrejected)
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return this.#json.finally(onfinally);
  }

  abort() {
    this.#controller.abort();
  }

  get #response() {
    return this.#promise.then(r => r.clone())
  }

  blob() {
    return this.#response.then(r => r.blob())
  }

  text() {
    return this.#response.then(r => r.text())
  }

  arrayBuffer() {
    return this.#response.then(r => r.arrayBuffer())
  }

  formData() {
    return this.#response.then(r => r.formData())
  }

  bytes() {
    return this.#response.then(r => r.bytes())
  }

  async *stream<T>() {
    const response = await this.#promise;
    const reader = response.clone()?.body?.getReader();
    if (!reader) {
      return;
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      let res: StreamContext = {
        source: value,
        result: value,
        error: null
      };
      try {
        for (const plugin of this.#plugins.transformStreamChunkPlugins) {
          res = await plugin(res);
        }
        yield res as StreamContext<T>;
      } catch (error) {
        res.error = error;
        res.result = null;
        yield res as StreamContext<null>;
      }
    }
  }
}
