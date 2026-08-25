import mongoose, {Document, Model, model, Schema} from "mongoose";

export interface IStory extends Document {
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Date;
}

const StorySchema = new Schema<IStory>({
  userId: {
    type: String,
    ref: "User",
    required: true,
  },
  mediaUrl: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
    createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours in seconds 
  },
}, {
  timestamps: true,
});

const Story: Model<IStory> = model<IStory>("Story", StorySchema);

export default Story;