import { server } from './app.config';

const port = Number(process.env.PORT) || 2567;
server.listen(port).then(() => console.log(`Pomodoro World server listening on :${port}`));
