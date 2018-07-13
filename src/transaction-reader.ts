// @ts-ignore
import { CryptoUtils } from 'loom-js'
import {
  SignedTx,
  NonceTx,
  Transaction,
  MessageTx,
  CallTx,
  Request,
  ContractMethodCall
} from 'loom-js/dist/proto/loom_pb'
import { MapEntry } from '@/pbs/common_pb'


export interface ISigned {
  sig: Uint8Array
  pubkey: Uint8Array
}

export interface IOneSigTx {
  tx: DelegateCallTx
  signed: ISigned
}

export interface IDecodedTx {
  method: string
  arrData: Array<any>
}


export function extractTxDataFromStr(base64Str: string): IOneSigTx {
  const pbBuf = CryptoUtils.bufferToProtobufBytes(CryptoUtils.B64ToUint8Array(base64Str))
  let lastError = Error || null
  try {
    const sig = readTxSignature(pbBuf)
    const payload = readTxPayload(pbBuf)
    return { tx: payload, signed: sig }
  } catch (e) {
    if (e instanceof Error) {
      throw lastError
    } else {
      lastError = e
    }
  }
  throw  lastError

}

function readTxPayload(i: Uint8Array): DelegateCallTx {
  const deSignedTx = SignedTx.deserializeBinary(i)
  const deNonceTx = NonceTx.deserializeBinary(deSignedTx.toArray()[0])
  const deTransaction = Transaction.deserializeBinary(deNonceTx.toArray()[0])
  const deMessageTx = MessageTx.deserializeBinary(deTransaction.toArray()[1])
  const deCallTx = CallTx.deserializeBinary(deMessageTx.toArray()[2])
  const deRequest = Request.deserializeBinary(deCallTx.toArray()[1])
  const deContractMethodCall = ContractMethodCall.deserializeBinary(deRequest.toArray()[2])
  let txArrData = readProtoData(deContractMethodCall)
  return txArrData
}

function readProtoData(cmc: ContractMethodCall): IDecodedTx {
  const methodName = cmc.toObject().method
  const txData = MapEntry.deserializeBinary(cmc.toArray()[1])
  const txStringArrData = txData.toArray()
  return { method: methodName, arrData: txStringArrData }
}


function readTxSignature(i: Uint8Array): ISigned {
  const deSignedTx = SignedTx.deserializeBinary(i)
  const deSignedTxArr = deSignedTx.toArray()
  const sig = deSignedTxArr[2]
  const pubkey = deSignedTxArr[1]
  return { sig, pubkey }
}
