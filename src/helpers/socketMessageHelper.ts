import { Types } from "mongoose";

const sendMessageRelatedInfo = (namespace: string, recipient: Types.ObjectId | string, data: any) => {
    //@ts-ignore
    const socket = global.io;
    // console.log(`${namespace}::${recipient}`,data)
    socket.emit(`${namespace}::${recipient}`, data);
}

export default sendMessageRelatedInfo;