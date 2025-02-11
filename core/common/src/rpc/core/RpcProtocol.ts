/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module RpcInterface
 */

import { BeEvent } from "@itwin/core-bentley";
import { IModelRpcProps } from "../../IModel";
import { RpcInterface, RpcInterfaceDefinition } from "../../RpcInterface";
import { RpcConfiguration } from "./RpcConfiguration";
import { RpcProtocolEvent, RpcRequestStatus, RpcResponseCacheControl } from "./RpcConstants";
import { RpcNotFoundResponse } from "./RpcControl";
import { RpcInvocation, SerializedRpcActivity } from "./RpcInvocation";
import { RpcMarshaling, RpcSerializedValue } from "./RpcMarshaling";
import { RpcOperation } from "./RpcOperation";
import { RpcRequest } from "./RpcRequest";

/** A serialized RPC operation descriptor.
 * @internal
 */
export interface SerializedRpcOperation {
  interfaceDefinition: string;
  operationName: string;
  interfaceVersion: string;
  encodedRequest?: string;
}

/** A serialized RPC operation request.
 * @internal
 */
export interface SerializedRpcRequest extends SerializedRpcActivity {
  operation: SerializedRpcOperation;
  method: string;
  path: string;
  parameters: RpcSerializedValue;
  caching: RpcResponseCacheControl;
  ip?: string;
  protocolVersion?: number;
  parametersOverride?: any[];
}

/** An RPC operation request fulfillment.
 * @internal
 */
export interface RpcRequestFulfillment {
  /** The RPC interface for the request. */
  interfaceName: string;

  /** The id for the request. */
  id: string;

  /** The result for the request. */
  result: RpcSerializedValue;

  /** The un-serialized result for the request. */
  rawResult: any;

  /** A protocol-specific status code value for the request. */
  status: number;

  /* A protocol-specific value for retrying this request. */
  retry?: string;

  /** Whether to compress the result with one of the client's supported encodings. */
  allowCompression?: boolean;
}

/** @internal */
export namespace RpcRequestFulfillment {
  export async function forUnknownError(request: SerializedRpcRequest, error: any): Promise<RpcRequestFulfillment> {
    const result = await RpcMarshaling.serialize(undefined, error);

    return {
      interfaceName: request.operation.interfaceDefinition,
      id: request.id,
      result,
      rawResult: error,
      status: RpcRequestStatus.Rejected,
    };
  }
}

/** Handles RPC protocol events.
 * @internal
 */
export type RpcProtocolEventHandler = (type: RpcProtocolEvent, object: RpcRequest | RpcInvocation, err?: any) => void;

/** Documents changes to the RPC protocol version.
 * @internal
 */
export enum RpcProtocolVersion {
  None = 0,
  IntroducedNoContent = 1,
  IntroducedStatusCategory = 2
}

/**
 * A backend response that is handled internally by the RPC system.
 * @internal
 */
export interface RpcManagedStatus {
  iTwinRpcCoreResponse: true;
  managedStatus: "pending" | "notFound" | "noContent";
  responseValue: string | { message: string } | RpcNotFoundResponse;
}

/** An application protocol for an RPC interface.
 * @internal
 */
export abstract class RpcProtocol {
  /** Events raised by all protocols. See [[RpcProtocolEvent]] */
  public static readonly events: BeEvent<RpcProtocolEventHandler> = new BeEvent();

  /** A version code that identifies the RPC protocol capabilties of this endpoint. */
  public static readonly protocolVersion: number = RpcProtocolVersion.IntroducedStatusCategory;

  /** The name of the RPC protocol version header. */
  public protocolVersionHeaderName = "";

  /** Events raised by the protocol. See [[RpcProtocolEvent]] */
  public readonly events: BeEvent<RpcProtocolEventHandler> = new BeEvent();

  /** The configuration for the protocol. */
  public readonly configuration: RpcConfiguration;

  /** The RPC request class for this protocol. */
  public abstract readonly requestType: typeof RpcRequest;

  /** The RPC invocation class for this protocol. */
  public readonly invocationType: typeof RpcInvocation = RpcInvocation;

  public serializedClientRequestContextHeaderNames: SerializedRpcActivity = {
    /** The name of the request id header. */
    id: "",

    /** The name of the application id header  */
    applicationId: "",

    /** The name of the version header. */
    applicationVersion: "",

    /** The name of the session id header  */
    sessionId: "",

    /** The name of the authorization header. */
    authorization: "",
  };

  /** If greater than zero, specifies where to break large binary request payloads. */
  public transferChunkThreshold: number = 0;

  /** Used by protocols that can transmit stream values natively. */
  public preserveStreams: boolean = false;

  /** Used by protocols that can transmit IModelRpcProps values natively. */
  public checkToken: boolean = false;

  /** Used by protocols that support user-defined status codes. */
  public supportsStatusCategory: boolean = false;

  /** If checkToken is true, will be called on the backend to inflate the IModelRpcProps for each request. */
  public inflateToken(tokenFromBody: IModelRpcProps, _request: SerializedRpcRequest): IModelRpcProps { return tokenFromBody; }

  /** Override to supply the status corresponding to a protocol-specific code value. */
  public getStatus(code: number): RpcRequestStatus {
    return code;
  }

  /** Override to supply the protocol-specific code corresponding to a status value. */
  public getCode(status: RpcRequestStatus): number {
    return status;
  }

  /** Override to supply the protocol-specific path value for an RPC operation. */
  public supplyPathForOperation(operation: RpcOperation, _request: RpcRequest | undefined): string {
    return JSON.stringify(operation);
  }

  /** Override to supply the operation for a protocol-specific path value. */
  public getOperationFromPath(path: string): SerializedRpcOperation {
    return JSON.parse(path);
  }

  /** Obtains the implementation result on the backend for an RPC operation request. */
  public async fulfill(request: SerializedRpcRequest): Promise<RpcRequestFulfillment> {
    return new (this.invocationType)(this, request).fulfillment;
  }

  /** Serializes a request. */
  public async serialize(request: RpcRequest): Promise<SerializedRpcRequest> {
    const serializedContext = await RpcConfiguration.requestContext.serialize(request);
    return {
      ...serializedContext,
      operation: {
        interfaceDefinition: request.operation.interfaceDefinition.interfaceName,
        operationName: request.operation.operationName,
        interfaceVersion: request.operation.interfaceVersion,
      },
      method: request.method,
      path: request.path,
      parameters: await RpcMarshaling.serialize(request.protocol, request.parameters),
      caching: RpcResponseCacheControl.None,
      protocolVersion: RpcProtocol.protocolVersion,
    };
  }

  /** Constructs a protocol. */
  public constructor(configuration: RpcConfiguration) {
    this.configuration = configuration;
    this.events.addListener((type, object) => RpcProtocol.events.raiseEvent(type, object));
  }

  /** @internal */
  public onRpcClientInitialized(_definition: RpcInterfaceDefinition, _client: RpcInterface): void { }

  /** @internal */
  public onRpcImplInitialized(_definition: RpcInterfaceDefinition, _impl: RpcInterface): void { }

  /** @internal */
  public onRpcClientTerminated(_definition: RpcInterfaceDefinition, _client: RpcInterface): void { }

  /** @internal */
  public onRpcImplTerminated(_definition: RpcInterfaceDefinition, _impl: RpcInterface): void { }
}
