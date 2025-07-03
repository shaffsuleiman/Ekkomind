// // services/chatService.js
// // import { 
// //   collection, 
// //   addDoc, 
// //   doc, 
// //   setDoc, 
// //   serverTimestamp 
// // } from 'firebase/firestore/lite'; // Try this if the regular import doesn't work
// // OR
// import { 
//   collection, 
//   addDoc, 
//   doc, 
//   setDoc, 
//   serverTimestamp 
// } from 'firebase/firestore'; // Try this if the lite version doesn't work

// import { db } from '../firebase';

// export const saveMessageToFirestore = async (userEmail, chatId, messageObj) => {
//   if (!userEmail || !chatId || !messageObj) {
//     console.error('Missing required parameters');
//     return;
//   }

//   try {
//     // Create message reference
//     const messagesRef = collection(db, 'users', userEmail, 'chats', chatId, 'messages');
    
//     // Add the message
//     const messageData = {
//       ...messageObj,
//       timestamp: serverTimestamp(),
//       createdAt: new Date().toISOString(),
//     };

//     const docRef = await addDoc(messagesRef, messageData);
    
//     // Update chat metadata
//     const chatRef = doc(db, 'users', userEmail, 'chats', chatId);
//     await setDoc(chatRef, {
//       lastUpdated: serverTimestamp(),
//     }, { merge: true });

//     return docRef.id;

//   } catch (error) {
//     console.error('Error saving message:', error);
//     throw error;
//   }
// };