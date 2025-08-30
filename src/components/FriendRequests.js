// src/components/FriendRequests.js
import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Button, Typography, message, Spin } from 'antd';
import { UserOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';

const { Text} = Typography;

const FriendRequests = () => {
  const [user] = useAuthState(auth);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const incomingQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIncomingRequests(requests);
      setLoading(false);
    });

    const outgoingQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOutgoingRequests(requests);
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
    };
  }, [user]);

  const acceptFriendRequest = async (requestId, fromUserId, fromUserEmail) => {
    try {
      await addDoc(collection(db, 'friendships'), {
        user1Id: user.uid,
        user1Email: user.email,
        user2Id: fromUserId,
        user2Email: fromUserEmail,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted'
      });

      message.success(`You are now friends with ${fromUserEmail}!`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      message.error('Failed to accept friend request');
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'rejected'
      });
      message.info('Friend request declined');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      message.error('Failed to reject friend request');
    }
  };

  const cancelFriendRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      message.info('Friend request cancelled');
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      message.error('Failed to cancel friend request');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card title="Friend Requests" style={{ marginBottom: 20 }}>
        {incomingRequests.length > 0 ? (
          <List
            dataSource={incomingRequests}
            renderItem={(request) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => acceptFriendRequest(request.id, request.fromUserId, request.fromUserEmail)}
                    size="small"
                  >
                    Accept
                  </Button>,
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => rejectFriendRequest(request.id)}
                    size="small"
                  >
                    Decline
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={`Friend request from ${request.fromUserEmail}`}
                  description={`Sent ${request.createdAt?.toDate()?.toLocaleDateString() || 'recently'}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Text type="secondary">No pending friend requests</Text>
          </div>
        )}
      </Card>

      {outgoingRequests.length > 0 && (
        <Card title="Sent Requests">
          <List
            dataSource={outgoingRequests}
            renderItem={(request) => (
              <List.Item
                actions={[
                  <Button
                    danger
                    size="small"
                    onClick={() => cancelFriendRequest(request.id)}
                  >
                    Cancel
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={`Request sent to ${request.toUserEmail}`}
                  description={`Sent ${request.createdAt?.toDate()?.toLocaleDateString() || 'recently'}`}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default FriendRequests;
