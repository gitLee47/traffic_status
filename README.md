# traffic_status
This project is for visualising data which contains packet flow from a source to 
a destination.

The technologies used are: Javascript, CSS, HTML, jQuery, jQuery-mockjax, lodash, Bootstrap and D3.js

Steps to set-up and run the visualisation:

1. Ensure node is installed. I am using Node v.4.4.7. This or a higher version is recommended.
2. Clone the repo and navigate to the app folder.
3. Run the command: npm install - to install the dependencies.
4. Run the command: npm run start - to start the server.
5. Navigate to localhost:8000/ on any browser to view the application.

Note about the application:
1. The application can read from two apis: traffic_status and traffic_status/frozen
2. There is a selection button in the application to choose reading from a specific api.
3. The top left canvas diplays the main visualisation, which show nodes and their connections. 
4. Hovering on any node highlights other connected nodes and displays a summary about the packet flow on the right panel as a table.
5. Drag and pin any node to a point on the canvas to get it out of thw way. Single click on the node to release it.
6. Use mouse scroll to zoom in and out of the graph.