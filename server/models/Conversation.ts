import mongoose, {Document, Model, model, Schema} from "mongoose";
 
export interface IConversation extends Document {
    participants: string[];
    lastMessage?: mongoose.Types.ObjectId;
    updatedAt: Date;
 }
 
 const ConversationSchema = new Schema<IConversation>({
   participants: {
     type: [String],
     ref: "User",
     required: true,
   },
   lastMessage: {
     type: Schema.Types.ObjectId,
     ref: "Message",
   },
   updatedAt: {
     type: Date,
     default: Date.now,
   },
 }, {
   timestamps: true,
 });

 ConversationSchema.index({ participants: 1 });
 
 const Conversation: Model<IConversation> = model<IConversation>("Conversation", ConversationSchema);
 
 export default Conversation;       
 