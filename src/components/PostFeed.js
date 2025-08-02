// src/components/PostFeed.js
import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';


const PostFeed = ({ refreshTrigger }) => {

  return (
    <div>
      Feed of posts will be displayed here :)
    </div>
  );
};

export default PostFeed;
