import React from 'react';

class DateTimeComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      date: new Date()
    };
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.tick(),
      1000
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    this.setState({
      date: new Date()
    });
  }

  render() {
    const horizontalLineStyle = {
      display: 'flex',
      borderBottom: '2px solid black',
      paddingBottom: '10px',
      color: 'red'
    };

    const h4Style = {
      margin: 2,
  
    };

    return (
      <div style={horizontalLineStyle}>
        <h4 style={h4Style}>Ngày: {this.state.date.getDate()}</h4>
        <h4 style={h4Style}>Tháng: {this.state.date.getMonth() + 1}</h4>
        <h4 style={{ ...h4Style, marginRight: 0 }}>Năm: {this.state.date.getFullYear()}</h4>
      </div>
    );
  }
}

export default DateTimeComponent;
