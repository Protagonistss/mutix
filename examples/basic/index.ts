import { createStore } from 'mutix';

console.log('Creating store...');
const store = createStore({ count: 0 });

store.subscribe(() => {
  console.log('State updated:', store.state);
});

console.log('Incrementing count...');
store.state.count++;
console.log('Current count:', store.state.count);
