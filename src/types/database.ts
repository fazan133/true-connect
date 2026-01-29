export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          bio: string | null
          avatar_url: string | null
          is_private: boolean
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_private?: boolean
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_private?: boolean
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          post_id: string
          parent_id: string | null
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          parent_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          parent_id?: string | null
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: string
          created_at?: string
        }
      }
      friend_requests: {
        Row: {
          id: string
          requester_id: string
          target_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          target_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          target_id?: string
          status?: string
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
        }
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          image_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          image_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          image_url?: string | null
          read_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string
          type: 'like' | 'comment' | 'follow' | 'friend_request' | 'friend_accept'
          post_id: string | null
          comment_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id: string
          type: 'like' | 'comment' | 'follow' | 'friend_request' | 'friend_accept'
          post_id?: string | null
          comment_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string
          type?: 'like' | 'comment' | 'follow' | 'friend_request' | 'friend_accept'
          post_id?: string | null
          comment_id?: string | null
          read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_friend_direct: {
        Args: { friend_user_id: string }
        Returns: void
      }
      remove_friend: {
        Args: { friend_user_id: string }
        Returns: void
      }
      accept_friend_request: {
        Args: { requester_user_id: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
export type FriendRequest = Database['public']['Tables']['friend_requests']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Friend request with requester profile
export interface FriendRequestWithProfile extends FriendRequest {
  requester: Profile
}

// Extended types with relations
export interface PostWithAuthor extends Post {
  profiles: Profile
  likes: Like[]
  comments: Comment[]
  _count?: {
    likes: number
    comments: number
  }
  isLiked?: boolean
}

export interface CommentWithAuthor extends Comment {
  profiles: Profile
  replies?: CommentWithAuthor[]
}

export interface ConversationWithDetails extends Conversation {
  conversation_participants: {
    user_id: string
    profiles: Profile
  }[]
  messages: Message[]
}

export interface MessageWithSender extends Message {
  profiles: Profile
}

export interface NotificationWithDetails extends Notification {
  actor: Profile
  post?: {
    id: string
    content: string
  } | null
}
