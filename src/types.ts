import type QueryString from 'qs';
import type { AnyObject } from 'typescript-api-pro';
import type { ResponseError } from './utils';

export type FetchResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'bytes';

export type RequestMethodWithParams = 'GET' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type RequestMethodWithBody = 'PUT' | 'PATCH' | 'POST';

export type RequestMethod = RequestMethodWithParams | RequestMethodWithBody;

export interface RequestConfig<P, D, E = AnyObject> extends Omit<RequestInit, 'body' | 'signal' | 'credentials' | 'method'> {
  url: string;
  baseURL: string;
  params?: P;
  data?: D;
  withCredentials?: boolean;
  extra?: E;
  method: RequestMethod;
  qsArrayFormat?: QueryString.IStringifyOptions['arrayFormat'];
}

// 下方 request 的 option
export type BaseRequestOptions<P, D, E = AnyObject> = Partial<{
  plugins: Array<HookFetchPlugin>;
  timeout: number;
  params: P;
  data: D;
  controller: AbortController;
  extra: E;
  qsArrayFormat: QueryString.IStringifyOptions['arrayFormat'];
  withCredentials: boolean;
  method: RequestMethod;
}> & Omit<RequestInit, 'body' | 'method'> & {
  url: string;
  baseURL: string;
};

// 插件模式
export interface FetchPluginContext<T = unknown, E = unknown, P = unknown, D = unknown> {
  config: RequestConfig<P, D, E>;
  response: Response;
  responseType: FetchResponseType;
  result?: T;
  controller: AbortController;
}

export interface StreamContext<T = unknown> {
  result: T;
  source: Uint8Array<ArrayBufferLike>;
  error: unknown | null;
}

type BeforeRequestHandler<E = unknown, P = unknown, D = unknown> = (config: RequestConfig<P, D, E>) => RequestConfig<P, D, E> | Promise<RequestConfig<P, D, E>>;

type AfterResponseHandler<T = unknown, E = unknown, P = unknown, D = unknown> = (context: FetchPluginContext<T>, config: RequestConfig<P, D, E>) => FetchPluginContext<T> | Promise<FetchPluginContext<T>>;

type BeforeStreamHandler<E = unknown, P = unknown, D = unknown> = (body: ReadableStream<any>, config: RequestConfig<P, D, E>) => ReadableStream<any> | Promise<ReadableStream<any>>;

type TransformStreamChunkHandler<E = unknown, P = unknown, D = unknown> = (chunk: StreamContext<any>, config: RequestConfig<P, D, E>) => StreamContext | Promise<StreamContext>;

export type OnFinallyHandler<E = unknown, P = unknown, D = unknown> = (res: Pick<FetchPluginContext<unknown, E, P, D>, 'config' | 'response'>) => void | Promise<void>;

export type HookFetchPlugin<T = unknown, E = unknown, P = unknown, D = unknown> = {
  /** 插件名称 */
  name: string;
  /** 优先级 */
  priority?: number;
  beforeRequest?: BeforeRequestHandler<E, P, D>;
  afterResponse?: AfterResponseHandler<T, E, P, D>;
  beforeStream?: BeforeStreamHandler<E, P, D>;
  transformStreamChunk?: TransformStreamChunkHandler<E, P, D>;
  onError?: (error: ResponseError, config: RequestConfig<P, D, E>) => Promise<Error | void | ResponseError<E>>;
  onFinally?: OnFinallyHandler<E, P, D>;
}

// 核心内容
export interface OptionProps {
  baseURL: string;
  timeout: number;
  headers: HeadersInit;
  plugins: Array<HookFetchPlugin<any, any, any, any>>;
  withCredentials: boolean;
}

export type BaseOptions = Partial<OptionProps>;

export type RequestOptions<P = AnyObject, D = AnyObject, E = AnyObject> = Omit<BaseRequestOptions<P, D, E>, 'url' | 'plugins' | 'baseURL' | 'controller'>;

/**
 * 已废除, 请改用 RequestOptions
 *
 * Deprecated, please use RequestOptions instead
 */
export type RequestUseOptions<P = AnyObject, D = AnyObject, E = AnyObject> = RequestOptions<P, D, E>;

export type RequestWithBodyOptions<D = AnyObject, P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, D, E>, 'data'>;

export type RequestWithParamsOptions<P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, null, E>, 'params' | 'data'>;

export type RequestWithBodyFnOptions<D = AnyObject, P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, D, E>, 'data' | 'method'>;

export type RequestWithParamsFnOptions<P = AnyObject, E = AnyObject> = Omit<RequestOptions<P, null, E>, 'params' | 'data' | 'method'>;

export type PostOptions<D = AnyObject, P = AnyObject, E = AnyObject> = RequestWithBodyFnOptions<D, P, E>;

export type PutOptions<D = AnyObject, P = AnyObject, E = AnyObject> = RequestWithBodyFnOptions<D, P, E>;

export type PatchOptions<D = AnyObject, P = AnyObject, E = AnyObject> = RequestWithBodyFnOptions<D, P, E>;

export type GetOptions<P = AnyObject, E = AnyObject> = RequestWithParamsFnOptions<P, E>;

export type HeadOptions<P = AnyObject, E = AnyObject> = RequestWithParamsFnOptions<P, E>;

/**
 * OPTIONS 方法请求的可选参数类型
 *
 * OPTIONS method request optional parameter types
 */
export type OptionsOptions<P = AnyObject, E = AnyObject> = RequestWithParamsFnOptions<P, E>;

export type DeleteOptions<P = AnyObject, E = AnyObject> = RequestWithParamsFnOptions<P, E>;
