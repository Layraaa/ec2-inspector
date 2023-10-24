/* History SSM */
const TableDataContext = React.createContext({
    data: [],
    setData: () => {}
});

const History = () => {
  const [data, setData] = React.useState([]);

  const addDataHandler = (event) => {
    const newData = event.detail;
    setData(prevData => [...prevData, { date: newData.date, instance: newData.instance, event: newData.event, details: newData.details }]);
  };

  React.useEffect(() => {
    window.addEventListener('addDataEvent', addDataHandler);

    return () => {
        window.removeEventListener('addDataEvent', addDataHandler);
    };
  }, []);

  return React.createElement(TableDataContext.Provider, { value: { data, setData } },
    React.createElement(HistoryTable, null)
  );
}

const HistoryTable = () => {
  const { data } = React.useContext(TableDataContext);

  const tableRows = data.map((row, index) => 
    React.createElement('tr', {key: index},
        React.createElement('td', { style: { whiteSpace: 'nowrap' } }, row.date),
        React.createElement('td', { style: { whiteSpace: 'nowrap' } }, row.instance),
        React.createElement('td', { style: { whiteSpace: 'nowrap' } }, row.event),
        React.createElement('td', null, row.details)
    )
  );

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', { className: 'row' },
        React.createElement('h2', { className: 'col-12 text-center' }, "History"),
    ),
    React.createElement('div', { className: 'row', style: { flex: '1', overflow: 'auto' } },
      React.createElement('div', { className: 'col-12'},
        React.createElement('div', null,
            React.createElement('table', { className: 'table table-hover table-bordered', style : { marginBottom: "0px" } },
                React.createElement('thead', null,
                React.createElement('tr', null,
                    React.createElement('th', null, 'Date'),
                    React.createElement('th', null, 'Instance ID'),
                    React.createElement('th', null, 'Event'),
                    React.createElement('th', null, 'Details')
                )
                ),
                React.createElement('tbody', null, tableRows)
            ),
        ),
      ),
    ),
    React.createElement('div', { className: 'row' },
        React.createElement('div', { className: 'col-6 text-center' },
            React.createElement('button', {
                className: 'btn btn-primary ',
                onClick: () => exportToCSV()
            }, 'Export to CSV'),
        ),
        React.createElement('div', { className: 'col-6 text-center' },
            React.createElement('button', {
                className: 'btn btn-primary',
                onClick: () => exportToExcel()
            }, 'Export to Excel'),
        ),
    ),
    );
}

const AddDataRow = (newData) => {
    const event = new CustomEvent('addDataEvent', { detail: newData });
    window.dispatchEvent(event);
}

const exportToExcel = () => {
    window.location.href = '/export_data_ssm_history_excel';
}

const exportToCSV = () => {
    window.location.href = '/export_data_ssm_history_csv';
}

/* LISTENERS */
document.addEventListener('DOMContentLoaded', function() {
    ReactDOM.render(
        React.createElement(History),
        document.getElementById("history")
    );
});