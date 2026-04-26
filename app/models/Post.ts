// app/models/Post.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

// User Interface (based on your User model)
interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  avatar?: string;
  isPrivate?: boolean;
  cover?: string;
  bio?: string;
}

// Comment Interface
export interface IComment extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transformed Comment Interface for JSON output
interface ICommentJSON {
  _id: string;
  content: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

// Post Interface
export interface IPost extends Document {
  _id: Types.ObjectId;
  content: string;
  contentType: "post";
  images: string[];
  userId: Types.ObjectId | IUser;
  likes: Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

// Transformed Post Interface for JSON output
interface IPostJSON {
  _id: string;
  content: string;
  contentType: "post";
  images: string[];
  userId: {
    _id: string;
    name: string;
    email: string;
    image?: string;
    avatar?: string;
    isPrivate?: boolean;
    bio?: string;
  };
  likes: string[];
  comments: ICommentJSON[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
}

// Comment Schema
const CommentSchema = new Schema<IComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { 
    timestamps: true
  }
);

// Add virtual for 'content' (alias for 'text') for frontend compatibility
CommentSchema.virtual('content').get(function() {
  return this.text;
});

// Custom toJSON method for comments
CommentSchema.methods.toJSON = function(): ICommentJSON {
  const comment = this.toObject() as any;
  
  // Transform the comment
  const transformed: ICommentJSON = {
    _id: comment._id.toString(),
    content: comment.text || comment.content,
    userId: {
      _id: '',
      name: '',
      email: ''
    },
    createdAt: comment.createdAt ? comment.createdAt.toISOString() : new Date().toISOString()
  };

  // Handle user data - check if populated
  if (comment.user && typeof comment.user === 'object') {
    if (comment.user._id) {
      // User is populated
      transformed.userId = {
        _id: comment.user._id.toString(),
        name: comment.user.name || 'Unknown User',
        email: comment.user.email || 'unknown@example.com',
        image: comment.user.image || comment.user.avatar
      };
    } else if (comment.user.toString) {
      // User is just ObjectId
      transformed.userId = {
        _id: comment.user.toString(),
        name: 'Unknown User',
        email: 'unknown@example.com'
      };
    }
  }

  if (comment.updatedAt) {
    transformed.updatedAt = comment.updatedAt.toISOString();
  }

  return transformed;
};

// Post Schema
const PostSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      trim: true,
    },
    contentType: {
      type: String,
      enum: ["post"],
      default: "post",
      index: true,
    },
    images: [{
      type: String,
    }],
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    comments: {
      type: [CommentSchema],
      default: [],
    },
  },
  { 
    timestamps: true
  }
);

// Virtual populate for author details
PostSchema.virtual('author', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for comment count
PostSchema.virtual('commentCount').get(function() {
  return this.comments?.length || 0;
});

// Virtual for like count
PostSchema.virtual('likeCount').get(function() {
  return this.likes?.length || 0;
});

// Indexes for better performance
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ "comments.user": 1 });
PostSchema.index({ "comments.createdAt": -1 });
PostSchema.index({ likes: 1 });

// Pre-save middleware to sort comments by createdAt (newest first)
PostSchema.pre('save', function(next) {
  if (this.isModified('comments') && this.comments && this.comments.length > 0) {
    this.comments.sort((a: IComment, b: IComment) => {
      const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return bDate - aDate;
    });
  }
});

// Pre-find middleware to populate user data
PostSchema.pre('find', function() {
  this.populate('userId', 'name email image avatar isPrivate bio')
      .populate('comments.user', 'name email image avatar');
});

PostSchema.pre('findOne', function() {
  this.populate('userId', 'name email image avatar isPrivate bio')
      .populate('comments.user', 'name email image avatar');
});

// Custom toJSON method for posts
PostSchema.methods.toJSON = function(): IPostJSON {
  const post = this.toObject() as any;
  
  // Transform the post
  const transformed: IPostJSON = {
    _id: post._id.toString(),
    content: post.content || '',
    contentType: 'post',
    images: post.images || [],
    userId: {
      _id: '',
      name: '',
      email: ''
    },
    likes: [],
    comments: [],
    createdAt: post.createdAt ? post.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: post.updatedAt ? post.updatedAt.toISOString() : new Date().toISOString(),
    likeCount: post.likes?.length || 0,
    commentCount: post.comments?.length || 0
  };

  // Handle userId data
  if (post.userId && typeof post.userId === 'object') {
    if (post.userId._id) {
      // User is populated
      transformed.userId = {
        _id: post.userId._id.toString(),
        name: post.userId.name || 'Unknown User',
        email: post.userId.email || 'unknown@example.com',
        image: post.userId.image || post.userId.avatar,
        isPrivate: post.userId.isPrivate || false,
        bio: post.userId.bio || ''
      };
    } else if (post.userId.toString) {
      // User is just ObjectId
      transformed.userId = {
        _id: post.userId.toString(),
        name: 'Unknown User',
        email: 'unknown@example.com'
      };
    }
  }

  // Transform likes to string array
  if (post.likes && Array.isArray(post.likes)) {
    transformed.likes = post.likes.map((like: any) => {
      if (like && like.toString) {
        return like.toString();
      } else if (like && like._id) {
        return like._id.toString();
      }
      return like;
    }).filter(Boolean);
  }

  // Transform comments using the CommentSchema's toJSON method
  if (post.comments && Array.isArray(post.comments)) {
    transformed.comments = post.comments.map((comment: any) => {
      // Check if comment is already a document
      if (comment.toJSON) {
        return comment.toJSON();
      }
      // Otherwise transform the comment object directly
      const commentObj = comment instanceof mongoose.Document ? comment.toObject() : comment;
      const transformed: ICommentJSON = {
        _id: commentObj._id?.toString() || '',
        content: commentObj.text || commentObj.content || '',
        userId: {
          _id: '',
          name: '',
          email: ''
        },
        createdAt: commentObj.createdAt ? new Date(commentObj.createdAt).toISOString() : new Date().toISOString()
      };
      if (commentObj.user && typeof commentObj.user === 'object' && commentObj.user._id) {
        transformed.userId = {
          _id: commentObj.user._id.toString(),
          name: commentObj.user.name || 'Unknown User',
          email: commentObj.user.email || 'unknown@example.com',
          image: commentObj.user.image || commentObj.user.avatar
        };
      }
      if (commentObj.updatedAt) {
        transformed.updatedAt = new Date(commentObj.updatedAt).toISOString();
      }
      return transformed;
    });
    
    // Sort comments by createdAt (newest first)
    transformed.comments.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate;
    });
  }

  return transformed;
};

// Type for Model
type PostModel = Model<IPost>;

// Create or retrieve model
const Post: PostModel = mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
