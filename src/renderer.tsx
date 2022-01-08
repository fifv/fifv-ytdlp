// alert('hi')
// console.log('hii');
//@ts-ignore
// window.myAPI.saySomething('here from renderer')
// window.myAPI.alertSomething('alert')

import ReactDOM from 'react-dom';
import App from './App'
console.log('react start render');
ReactDOM.render(

	<App />,

	document.getElementById('root')

)
console.log('react finish render');
