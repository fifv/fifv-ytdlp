// alert('hi')
// console.log('hii');
//#@ts-ignore
// window.myAPI.saySomething('here from renderer')
// window.myAPI.alertSomething('alert')
import { createRoot } from 'react-dom/client'
import App from './App'
console.log('*react start render');
createRoot(document.getElementById('root') as HTMLElement).render(
    // <StrictMode>
    <App />
    // </StrictMode>
)
console.log('*react finish render');
