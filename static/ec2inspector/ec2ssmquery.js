/* REACT */

const { useEffect, useState, useRef, useCallback } = React;

/* W */

const w = ({instanceid, region, shouldFetch = true}) => {
    // Constants
    const [data, setData] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [topRow, setTopRow] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [filters, setFilters] = useState({});
    const updateButtonRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
    const [headerHoverIndex, setHeaderHoverIndex] = useState(null);
    const [filteredData, setFilteredData] = useState([]);

    // Fetch data
    const fetchData = useCallback(() => {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                const rows = data[instanceid];
                setFilteredData(rows.filter(row => {
                    return Object.entries(filters).every(([columnIndex, filter]) => {
                        return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                    });
                }));
            }
        } else {
            axios.get('/get_data_ssm_w', { params: { instanceid: instanceid, region: region } })
            .then(response => {

                if (response === "None"){
                    return;
                }

                const rows = response.data.split('\n')
                .filter(item => item.trim().length > 0)
                .map(item => {  
                    const splitRow = item.trim().split(' ');
                    const commandPart = splitRow.slice(7).join(' ');
                    return [...splitRow.slice(0, 7), commandPart];
                });

                setData(prevData => ({
                    ...prevData,
                    [instanceid]: rows,
                }));

            });
        }
    }, [instanceid, region, filters, data, shouldFetch]);

    useEffect(fetchData, [instanceid, region]);

    // Button
    useEffect(() => {
      const button = updateButtonRef.current;

      if (button) {
        button.addEventListener('click', fetchData);
      }

      return () => {
        if (button) {
          button.removeEventListener('click', fetchData);
        }
      };
    }, []);
    
    useEffect(() => {
        if (Object.keys(data).length > 0 && data[instanceid]) {
            setCurrentPage(0);
            setFilteredData(data[instanceid].filter(row => {
                return Object.entries(filters).every(([columnIndex, filter]) => {
                    return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                });
            }));
        }
    }, [filters, data]);
    
    // Update pages with changerow
    const startRow = currentPage * pageSize;

    const changePage = page => {
      setCurrentPage(page);
      setTopRow(page * pageSize);
    };

    useEffect(() => {
      const newPage = Math.floor(topRow / pageSize);
      setCurrentPage(newPage);
    }, [pageSize]);

    // Update paginatedData calculation
    const paginatedData = filteredData.slice(startRow, startRow + pageSize);
    const totalPages = Math.ceil(filteredData.length / pageSize);

    const headers = ["USER", "TTY", "FROM", "LOGIN", "IDLE", "JCPU", "PCPU", "WHAT"]

    // Order
    const onSort = key => {
      let direction = 'ascending';
      if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
        direction = 'none';
      }
      setSortConfig({ key, direction });
    };

    // Order Effect
    useEffect(() => {
      if (sortConfig.direction === 'none') {
          setFilteredData(Array.isArray(data[instanceid]) ? [...data[instanceid]] : []);
      } else {
          const sortedData = [...data[instanceid]].sort((a, b) => {
              const aValue = isNaN(a[sortConfig.key]) ? a[sortConfig.key] : Number(a[sortConfig.key]);
              const bValue = isNaN(b[sortConfig.key]) ? b[sortConfig.key] : Number(b[sortConfig.key]);

              if (aValue < bValue) {
                  return sortConfig.direction === 'ascending' ? -1 : 1;
              }
              if (aValue > bValue) {
                  return sortConfig.direction === 'ascending' ? 1 : -1;
              }
              return 0;
          });
          setFilteredData(sortedData);
      }
    }, [sortConfig, data]);

    // Create container
    if (!shouldFetch && !data[instanceid]) return null;

    return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { className: 'row' },
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12' },
                    React.createElement('h3', { className: 'text-center' }, "Number of users: " + filteredData.length    
                    )
                )
            ),
            React.createElement('details', null,
                React.createElement('summary', null, "Filters"),
                headers ? [...Array(Math.ceil(headers?.length / 4))].map((_, rowIndex) => 
                    React.createElement('div', { className: 'row', key: rowIndex },
                        headers?.slice(rowIndex * 4, (rowIndex + 1) * 4).map((header, index) =>
                            React.createElement('div', { className: 'col-3', key: index },
                                React.createElement('input', { 
                                    type: 'text',
                                    className: 'form-control', 
                                    placeholder: header,
                                    value: filters[rowIndex * 4 + index] || '', 
                                    name: header,
                                    onChange: e => setFilters({...filters, [rowIndex * 4 + index]: e.target.value})
                                })
                            )
                        )
                    )
                ) : null,
            ),
            data[instanceid] ? React.createElement('div', { className: 'row'},
                React.createElement('div', { className: 'col-12'},
                React.createElement('table', { className: 'table table-hover table-bordered' },
                    React.createElement('thead', null,
                    React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                    headers?.map((header, index) => 
                        React.createElement('th', {
                            key: index,
                            onClick: () => onSort(index),
                            onMouseEnter: () => setHeaderHoverIndex(index),
                            onMouseLeave: () => setHeaderHoverIndex(null),
                            style: { position: 'relative', cursor : 'pointer' }
                        }, 
                        headerHoverIndex === index 
                            ? React.createElement('span', {
                                    style: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }
                                }, index === sortConfig.key
                                    ? (sortConfig.direction === 'ascending' ? '↑' : sortConfig.direction === 'descending' ? '↓' : '-')
                                    : '-')
                                : null,
                        React.createElement('span', { 
                            style: { 
                                visibility: headerHoverIndex === index ? 'hidden' : 'visible' 
                            } 
                        }, header))
                    )
                    )
                    ),
                    React.createElement('tbody', null, 
                        paginatedData.map((row, index) => 
                        React.createElement('tr', { key: index }, 
                            row.map((cell, index) => React.createElement('td', { key: index }, cell))
                        )
                        )
                    )
                )
                )
            ) : React.createElement('h3', { className : 'text-center' }, 'Loading...'),
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12 controls' },
                React.createElement('button', { onClick: () => changePage(currentPage - 1), disabled: startRow < 1, className: 'ssmbuttons' }, 'Previous Page'),
                React.createElement('button', { onClick: () => changePage(currentPage + 1), disabled: currentPage >= totalPages - 1, className: 'ssmbuttons' }, 'Next Page'),
                React.createElement('label', null, 
                    'Rows per page: ',
                    React.createElement('select', { 
                        value: pageSize,
                        name: "select_w",
                        onChange: e => setPageSize(Number(e.target.value)) 
                    }, 
                    React.createElement('option', { value: 5 }, '5'),
                    React.createElement('option', { value: 10 }, '10'),
                    React.createElement('option', { value: 20 }, '20'),
                    React.createElement('option', { value: 50 }, '50')
                    )
                ),
                React.createElement('div', null, `Page ${Math.floor(startRow / pageSize) + 1} of ${totalPages}`),
                React.createElement('div', null, `Rows ${startRow + 1} - ${Math.min((startRow + pageSize), filteredData.length)} of ${filteredData.length}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
                )
            )
        ),
        React.createElement('hr', { className: 'ssmhr' })
    );
}

/* CONNECTIONS */

const connections = ({ instanceid, region, shouldFetch = true }) => {
    // Constants
    const [data, setData] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [topRow, setTopRow] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [filters, setFilters] = useState({});
    const updateButtonRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
    const [headerHoverIndex, setHeaderHoverIndex] = useState(null);
    const [filteredData, setFilteredData] = useState([]);

    // Fetch data
    const fetchData = useCallback(() => {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                const rows = data[instanceid];
                setFilteredData(rows.filter(row => {
                    return Object.entries(filters).every(([columnIndex, filter]) => {
                        return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                    });
                }));
            }
        } else {
            axios.get('/get_data_ssm_connections', { params: { instanceid: instanceid, region: region } })
                .then(response => {
                    if (response === "None"){
                        return;
                    }
                    const rows = response.data.split('\n')
                        .map(item => {
                            const row = item.trim().split(' ');
                            if (row.length === 3) {
                                row.push('-');
                            }
                            return row;
                        })
                        .filter(item => item.length > 1);
                    setData(prevData => ({
                        ...prevData,
                        [instanceid]: rows,
                    }));
                });
        }
    }, [instanceid, region, filters, data, shouldFetch]);

    useEffect(fetchData, [instanceid, region]);

    // Button
    useEffect(() => {
        const button = updateButtonRef.current;

        if (button) {
            button.addEventListener('click', fetchData);
        }

        return () => {
            if (button) {
            button.removeEventListener('click', fetchData);
            }
        };
    }, [fetchData]);

    useEffect(() => {
        if (Object.keys(data).length > 0 && data[instanceid]) {
            setCurrentPage(0);
            setFilteredData(data[instanceid].filter(row => {
                return Object.entries(filters).every(([columnIndex, filter]) => {
                    return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                });
            }));
        }
    }, [filters, data]);

    // Update pages with changerow
    const startRow = currentPage * pageSize;

    const changePage = page => {
        setCurrentPage(page);
        setTopRow(page * pageSize);
    };

    useEffect(() => {
        const newPage = Math.floor(topRow / pageSize);
        setCurrentPage(newPage);
    }, [pageSize]);

    // Update paginatedData calculation
    const paginatedData = filteredData.slice(startRow, startRow + pageSize);
    const totalPages = Math.ceil(filteredData.length / pageSize);

    const headers = ['Protocol', 'Local Address', 'Foreign Address', 'State']

    // Order
    const onSort = key => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'none';
        }
        setSortConfig({ key, direction });
    };

    // Order Effect
    useEffect(() => {
        if (sortConfig.direction === 'none') {
            setFilteredData(Array.isArray(data[instanceid]) ? [...data[instanceid]] : []);
        } else {
            const sortedData = [...data[instanceid]].sort((a, b) => {
                const aValue = isNaN(a[sortConfig.key]) ? a[sortConfig.key] : Number(a[sortConfig.key]);
                const bValue = isNaN(b[sortConfig.key]) ? b[sortConfig.key] : Number(b[sortConfig.key]);
    
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
            setFilteredData(sortedData);
        }
    }, [sortConfig, data]);


    // Create container
    if (!shouldFetch && !data[instanceid]) return null;

    return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { className: 'row' },
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12' },
                    React.createElement('h3', { className: 'text-center' }, "Number of connections: " + filteredData.length    
                    )
                )
            ),
            React.createElement('details', null,
                React.createElement('summary', null, "Filters"),
                headers ? [...Array(Math.ceil(headers?.length / 4))].map((_, rowIndex) => 
                    React.createElement('div', { className: 'row', key: rowIndex },
                        headers?.slice(rowIndex * 4, (rowIndex + 1) * 4).map((header, index) =>
                            React.createElement('div', { className: 'col-3', key: index },
                                React.createElement('input', {
                                    type: 'text',
                                    className: 'form-control', 
                                    placeholder: header,
                                    value: filters[rowIndex * 4 + index] || '',
                                    name: header,
                                    onChange: e => setFilters({...filters, [rowIndex * 4 + index]: e.target.value})
                                })
                            )
                        )
                    )
                ) : null,
            ),
            data[instanceid] ? React.createElement('div', { className: 'row'},
                React.createElement('div', { className: 'col-12'},
                React.createElement('table', { className: 'table table-hover table-bordered' },
                React.createElement('thead', null,
                React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                    headers?.map((header, index) => 
                        React.createElement('th', {
                            key: index,
                            onClick: () => onSort(index),
                            onMouseEnter: () => setHeaderHoverIndex(index),
                            onMouseLeave: () => setHeaderHoverIndex(null),
                            style: { position: 'relative', cursor : 'pointer' }
                        }, 
                        headerHoverIndex === index 
                            ? React.createElement('span', {
                                style: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }
                            }, index === sortConfig.key
                                ? (sortConfig.direction === 'ascending' ? '↑' : sortConfig.direction === 'descending' ? '↓' : '-')
                                : '-')
                            : null,
                        React.createElement('span', { 
                            style: { 
                                visibility: headerHoverIndex === index ? 'hidden' : 'visible' 
                            } 
                        }, header))
                    )
                )
                ),
                React.createElement('tbody', null, 
                    paginatedData.map((row, index) => 
                    React.createElement('tr', { key: index }, 
                        row.map((cell, index) => React.createElement('td', { key: index }, cell))
                    )
                    )
                )
                )
                )
            ) : React.createElement('h3', { className : 'text-center' }, 'Loading...'),
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12 controls' },
                React.createElement('button', { onClick: () => changePage(currentPage - 1), disabled: startRow < 1, className: 'ssmbuttons' }, 'Previous Page'),
                React.createElement('button', { onClick: () => changePage(currentPage + 1), disabled: currentPage >= totalPages - 1, className: 'ssmbuttons' }, 'Next Page'),
                React.createElement('label', null, 
                    'Rows per page: ',
                    React.createElement('select', { 
                        value: pageSize,
                        name: "select_connections",
                        onChange: e => setPageSize(Number(e.target.value)) 
                    }, 
                    React.createElement('option', { value: 5 }, '5'),
                    React.createElement('option', { value: 10 }, '10'),
                    React.createElement('option', { value: 20 }, '20'),
                    React.createElement('option', { value: 50 }, '50')
                    )
                ),
                React.createElement('div', null, `Page ${Math.floor(startRow / pageSize) + 1} of ${totalPages}`),
                React.createElement('div', null, `Rows ${startRow + 1} - ${Math.min((startRow + pageSize), filteredData.length)} of ${filteredData.length}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
                )
            )
        ),
        React.createElement('hr', { className: 'ssmhr' })
    );
}

/* UPDATE PACKAGES */

const updatepackages = ({ instanceid, region, shouldFetch = true }) => {
    // Constants
    const [data, setData] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [topRow, setTopRow] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [filters, setFilters] = useState({});
    const [headers, setHeaders] = useState([]);
    const updateButtonRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
    const [headerHoverIndex, setHeaderHoverIndex] = useState(null);
    const [filteredData, setFilteredData] = useState([]);

    // Fecth data
    const fetchData = useCallback(() => {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                const rows = data[instanceid];

                if (data[instanceid][0]){
                    if (data[instanceid][0].length > 3 ){
                        newHeaders = ['Package', 'Version', 'Architecture', 'Description'];
                    } else {
                        newHeaders = ['Package', 'Version', 'Packager'];
                    }
                    setHeaders(newHeaders);
                }

                setFilteredData(rows.filter(row => {
                    return Object.entries(filters).every(([columnIndex, filter]) => {
                        return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                    });
                }));
            }
        } else {
        axios.get('/get_data_ssm_updatespackages', { params: { instanceid: instanceid, region: region } })

            .then(response => {
                if (response === "None"){
                    return;
                }

                const [firstWord, ...rest] = response.data.split('\n');
                let newHeaders = [];

                if (firstWord === 'yum' || firstWord === 'dnf') {
                    newHeaders = ['Package', 'Version', 'Packager'];
                    const rows = rest.join('\n').split('\n')
                        .filter(item => item.trim().length > 0)
                        .map(item => {
                            const parts = item.trim().split(' ', 3);
                            return [...parts.slice(0, 2), parts.slice(2).join(' ')];
                        })
                        .filter(item => item.length > 1);
                    setData(prevData => ({
                        ...prevData,
                        [instanceid]: rows,
                    }));
                } else if (firstWord === 'apt') {
                    newHeaders = ['Package', 'Version', 'Architecture', 'Description'];
                    const rows = rest.join('\n').split('\n')
                        .filter(item => item.trim().length > 0)
                        .map(item => {
                            const parts = item.trim().split(',', 4);
                            return [...parts.slice(0, 3), parts.slice(3).join(',')];
                        })
                        .filter(item => item.length > 1);
                    setData(prevData => ({
                        ...prevData,
                        [instanceid]: rows,
                    }));
                }
                else {
                    newHeaders = [];
                }

                setHeaders(newHeaders);

            });
        }
    }, [instanceid, region, filters, data, shouldFetch]);

    useEffect(fetchData, [instanceid, region]);

    // Button
    useEffect(() => {
        const button = updateButtonRef.current;

        if (button) {
            button.addEventListener('click', fetchData);
        }

        return () => {
            if (button) {
                button.removeEventListener('click', fetchData);
            }
        };
    }, []);

    useEffect(() => {
        if (Object.keys(data).length > 0 && data[instanceid]) {
            setCurrentPage(0);
            setFilteredData(data[instanceid].filter(row => {
                return Object.entries(filters).every(([columnIndex, filter]) => {
                    return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                });
            }));
        }
    }, [filters, data, headers]);

    // Update pages with changerow
    const startRow = currentPage * pageSize;

    const changePage = page => {
        setCurrentPage(page);
        setTopRow(page * pageSize);
    };

    useEffect(() => {
        const newPage = Math.floor(topRow / pageSize);
        setCurrentPage(newPage);
    }, [pageSize]);

    // Update paginatedData calculation
    const paginatedData = filteredData.slice(startRow, startRow + pageSize);
    const totalPages = Math.ceil(filteredData.length / pageSize);

    // Order
    const onSort = key => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'none';
        }
        setSortConfig({ key, direction });
    };

    // Order Effect
    useEffect(() => {
        if (sortConfig.direction === 'none') {
            setFilteredData(Array.isArray(data[instanceid]) ? [...data[instanceid]] : []);
        } else {
            const sortedData = [...data[instanceid]].sort((a, b) => {
                const aValue = isNaN(a[sortConfig.key]) ? a[sortConfig.key] : Number(a[sortConfig.key]);
                const bValue = isNaN(b[sortConfig.key]) ? b[sortConfig.key] : Number(b[sortConfig.key]);

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
            setFilteredData(sortedData);
        }
    }, [sortConfig, data]);

    // Create container
    if (!shouldFetch && !data[instanceid]) return null;

    return React.createElement(
        React.Fragment,
        null, 
        React.createElement('div', { className: 'row' },
            React.createElement('div', { className: 'col-12' },
                React.createElement('h3', { className: 'text-center' }, "Number of updates: " + filteredData.length)
            ),
            React.createElement('details', null,
                React.createElement('summary', null, "Filters"),
                headers ? [...Array(Math.ceil(headers.length / 4))].map((_, rowIndex) => 
                    React.createElement('div', { className: 'row', key: rowIndex },
                        headers.slice(rowIndex * 4, (rowIndex + 1) * 4).map((header, index) =>
                            React.createElement('div', { className: 'col-3', key: index },
                                React.createElement('input', {
                                    type: 'text',
                                    className: 'form-control', 
                                    placeholder: header,
                                    value: filters[rowIndex * 4 + index] || '',
                                    name: header,
                                    onChange: e => setFilters({...filters, [rowIndex * 4 + index]: e.target.value})
                                })
                            )
                        )
                    )
                ) : null,
            ),
            data[instanceid] ? React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12'},
                    React.createElement('table', { className: 'table table-hover table-bordered' },
                    React.createElement('thead', null,
                    React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                    headers?.map((header, index) => 
                        React.createElement('th', {
                            key: index,
                            onClick: () => onSort(index),
                            onMouseEnter: () => setHeaderHoverIndex(index),
                            onMouseLeave: () => setHeaderHoverIndex(null),
                            style: { position: 'relative', cursor : 'pointer' }
                        }, 
                        headerHoverIndex === index 
                            ? React.createElement('span', {
                                    style: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }
                                }, index === sortConfig.key
                                    ? (sortConfig.direction === 'ascending' ? '↑' : sortConfig.direction === 'descending' ? '↓' : '-')
                                    : '-')
                                : null,
                        React.createElement('span', { 
                            style: { 
                                visibility: headerHoverIndex === index ? 'hidden' : 'visible' 
                            } 
                        }, header))
                    )
                    )
                    ),
                    React.createElement('tbody', null, 
                        paginatedData.map((row, index) => 
                        React.createElement('tr', { key: index }, 
                            row.map((cell, index) => React.createElement('td', { key: index }, cell))
                        )
                        )
                    )
                    )
                )
            ) : React.createElement('h3', { className : 'text-center' }, 'Loading...'),
            React.createElement('div', { className: 'row' },
            React.createElement('div', { className: 'col-12 controls' },
                React.createElement('button', { onClick: () => changePage(currentPage - 1), disabled: startRow < 1, className: 'ssmbuttons' }, 'Previous Page'),
                React.createElement('button', { onClick: () => changePage(currentPage + 1), disabled: currentPage >= totalPages - 1, className: 'ssmbuttons' }, 'Next Page'),
                React.createElement('label', null, 
                    'Rows per page: ',
                    React.createElement('select', { 
                        value: pageSize,
                        name: "select_updates",
                        onChange: e => setPageSize(Number(e.target.value)) 
                    }, 
                    React.createElement('option', { value: 5 }, '5'),
                    React.createElement('option', { value: 10 }, '10'),
                    React.createElement('option', { value: 20 }, '20'),
                    React.createElement('option', { value: 50 }, '50')
                    )
                ),
                React.createElement('div', null, `Page ${Math.floor(startRow / pageSize) + 1} of ${totalPages}`),
                React.createElement('div', null, `Rows ${startRow + 1} - ${Math.min((startRow + pageSize), filteredData.length)} of ${filteredData.length}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
            )
            )    
        ),
        React.createElement('hr', { className: 'ssmhr' })
    );
}

/* Installed packages */

const installedpackages = ({ instanceid, region, shouldFetch = true }) => {
    // Constants
    const [data, setData] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [topRow, setTopRow] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [filters, setFilters] = useState({});
    const [headers, setHeaders] = useState([]);
    const updateButtonRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
    const [headerHoverIndex, setHeaderHoverIndex] = useState(null);
    const [filteredData, setFilteredData] = useState([]);

    // Fetch data
    const fetchData = useCallback(() =>  {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                const rows = data[instanceid];
                if (data[instanceid][0]){
                    if (data[instanceid][0].length > 4 ){
                        newHeaders = ['Name', 'Version', 'Release', 'Architecture', 'Install time', 'Build time', 'Size', 'License', 'Vendor', 'URL', 'Summary', 'Packager'];
                    } else {
                        newHeaders = ['Package', 'Version', 'Architecture', 'Description'];
                    }
                    setHeaders(newHeaders);
                }
                setFilteredData(rows.filter(row => {
                    return Object.entries(filters).every(([columnIndex, filter]) => {
                        return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                    });
                }));
            }
        } else {
            axios.get('/get_data_ssm_installedpackages', { params: { instanceid: instanceid, region: region } })
                .then(response => {

                    if (response === "None"){
                        return;
                    }

                    const [firstWord, ...rest] = response.data.split('\n');
                    let newHeaders = [];

                    if (firstWord === 'rpm') {
                        newHeaders = ['Name', 'Version', 'Release', 'Architecture', 'Install time', 'Build time', 'Size', 'License', 'Vendor', 'URL', 'Summary', 'Packager'];
                        const rows = rest.join('\n').split('\n')
                            .map(item => {
                                const parts = item.trim().split(',', 12);
                                return [...parts.slice(0, 11), parts.slice(11).join(',')];
                            })
                            .filter(item => item.length > 1);
                        setData(prevData => ({
                            ...prevData,
                            [instanceid]: rows,
                        }));
                    } else if (firstWord === 'dpkg') {
                        newHeaders = ['Package', 'Version', 'Architecture', 'Description'];
                        const rows = rest.join('\n').split('\n')
                            .map(item => {
                                const parts = item.trim().split(',', 4);
                                return [...parts.slice(0, 3), parts.slice(3).join(',')];
                            })
                            .filter(item => item.length > 1);
                        setData(prevData => ({
                            ...prevData,
                            [instanceid]: rows,
                        }));
                    }
                    else {
                        newHeaders = [];
                    }

                    setHeaders(newHeaders);
            
                });

        }
    }, [instanceid, region, filters, data, shouldFetch]);

    useEffect(fetchData, [instanceid, region]);

    // Button
    useEffect(() => {
    const button = updateButtonRef.current;

    if (button) {
        button.addEventListener('click', fetchData);
    }

    return () => {
        if (button) {
            button.removeEventListener('click', fetchData);
        }
    };
    }, []);

    // Filters
    useEffect(() => {
        if (Object.keys(data).length > 0 && data[instanceid]) {
            setCurrentPage(0);
            setFilteredData(data[instanceid].filter(row => {
                return Object.entries(filters).every(([columnIndex, filter]) => {
                    return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                });
            }));
        }
    }, [filters, data, headers]);

    // Update pages with changerow
    const startRow = currentPage * pageSize;

    const changePage = page => {
        setCurrentPage(page);
        setTopRow(page * pageSize);
    };

    useEffect(() => {
        const newPage = Math.floor(topRow / pageSize);
        setCurrentPage(newPage);
    }, [pageSize]);

    // Update paginatedData calculation
    const paginatedData = filteredData.slice(startRow, startRow + pageSize);
    const totalPages = Math.ceil(filteredData.length / pageSize);

    // Order
    const onSort = key => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'none';
        }
        setSortConfig({ key, direction });
    };

    // Order Effect
    useEffect(() => {
    if (sortConfig.direction === 'none') {
        setFilteredData(Array.isArray(data[instanceid]) ? [...data[instanceid]] : []);
    } else {
        const sortedData = [...data[instanceid]].sort((a, b) => {
            const aValue = isNaN(a[sortConfig.key]) ? a[sortConfig.key] : Number(a[sortConfig.key]);
            const bValue = isNaN(b[sortConfig.key]) ? b[sortConfig.key] : Number(b[sortConfig.key]);

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        setFilteredData(sortedData);
    }
    }, [sortConfig, data]);

    // Create container
    if (!shouldFetch && !data[instanceid]) return null;
    
    return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { className: 'row' },
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12' },
                    React.createElement('h3', { className: 'text-center' }, "Number of packages: " + filteredData.length    
                    )
                )
            ),
            React.createElement('details', null,
                React.createElement('summary', null, "Filters"),
                headers ? [...Array(Math.ceil(headers.length / 4))].map((_, rowIndex) => 
                    React.createElement('div', { className: 'row', key: rowIndex },
                        headers.slice(rowIndex * 4, (rowIndex + 1) * 4).map((header, index) =>
                            React.createElement('div', { className: 'col-3', key: index },
                                React.createElement('input', {
                                    type: 'text',
                                    className: 'form-control', 
                                    placeholder: header,
                                    value: filters[rowIndex * 4 + index] || '',
                                    name: header,
                                    onChange: e => setFilters({...filters, [rowIndex * 4 + index]: e.target.value})
                                })
                            )
                        )
                    )
                ) : null,
            ), 
            data[instanceid] ? React.createElement('div', { className: 'row'},
                React.createElement('div', { className: 'col-12', style: { overflowX: "auto" }},
                    React.createElement('table', { className: 'table table-hover table-bordered' },
                        React.createElement('thead', null,
                        React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                            headers?.map((header, index) => 
                                React.createElement('th', {
                                    key: index,
                                    onClick: () => onSort(index),
                                    onMouseEnter: () => setHeaderHoverIndex(index),
                                    onMouseLeave: () => setHeaderHoverIndex(null),
                                    style: { position: 'relative', cursor : 'pointer' }
                                }, 
                                headerHoverIndex === index 
                                    ? React.createElement('span', {
                                        style: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }
                                    }, index === sortConfig.key
                                        ? (sortConfig.direction === 'ascending' ? '↑' : sortConfig.direction === 'descending' ? '↓' : '-')
                                        : '-')
                                    : null,
                                React.createElement('span', { 
                                    style: { 
                                        visibility: headerHoverIndex === index ? 'hidden' : 'visible' 
                                    } 
                                }, header))
                            )
                        )
                        ),
                        React.createElement('tbody', null, 
                            paginatedData.map((row, index) => 
                            React.createElement('tr', { key: index }, 
                                row.map((cell, index) => React.createElement('td', { key: index }, cell))
                            )
                            )
                        )
                    )
                )
            ) : React.createElement('h3', { className : 'text-center' }, 'Loading...'),
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12 controls' },
                React.createElement('button', { onClick: () => changePage(currentPage - 1), disabled: startRow < 1, className: 'ssmbuttons' }, 'Previous Page'),
                React.createElement('button', { onClick: () => changePage(currentPage + 1), disabled: currentPage >= totalPages - 1, className: 'ssmbuttons' }, 'Next Page'),
                React.createElement('label', null, 
                    'Rows per page: ',
                    React.createElement('select', { 
                        value: pageSize,
                        name: "select_packages",
                        onChange: e => setPageSize(Number(e.target.value)) 
                    }, 
                    React.createElement('option', { value: 5 }, '5'),
                    React.createElement('option', { value: 10 }, '10'),
                    React.createElement('option', { value: 20 }, '20'),
                    React.createElement('option', { value: 50 }, '50')
                    )
                ),
                React.createElement('div', null, `Page ${Math.floor(startRow / pageSize) + 1} of ${totalPages}`),
                React.createElement('div', null, `Rows ${startRow + 1} - ${Math.min((startRow + pageSize), filteredData.length)} of ${filteredData.length}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
                )
            )
        ),
        React.createElement('hr', { className: 'ssmhr' })
    );
}

/* SERVICES */

const services = ({ instanceid, region, shouldFetch = true }) => {
    // Constants
    const [currentPage, setCurrentPage] = useState(0);
    const [data, setData] = useState({});
    const [pages, setPages] = useState([]);
    const updateButtonRef = useRef(null);
    
    // Fectch data
    const fetchData = useCallback(() => {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                return null;
            }
        } else {
            axios.get('/get_data_ssm_services', { params: { instanceid: instanceid, region: region } })
            .then(response => {
                const rows = response.data.split('\n').filter(item => item.trim() !== '');
                setData(prevData => ({
                    ...prevData,
                    [instanceid]: rows,
                }));
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }
    }, [instanceid, region, data, shouldFetch]);
    
    useEffect(fetchData, [instanceid, region]);

    // Button
    useEffect(() => {
        const button = updateButtonRef.current;

        if (button) {
            button.addEventListener('click', fetchData);
        }

        return () => {
            if (button) {
                button.removeEventListener('click', fetchData);
            }
        };
    }, []);

    // Fecth status data
    useEffect(() => {
        if (!shouldFetch) {
            if (pages && pages[instanceid]) {
                return null;
            }
        } else {
            if (data[instanceid] && data[instanceid].length > 0) {
                axios.get('/get_data_ssm_services_detailsloop', { params: { instanceid: instanceid, region: region, subfilteredserviceslines : data[instanceid].join(',') }, })
                .then(response => {
                    if (response === "None"){
                        return;
                    }
                    const parts = response.data.split('x&-z$');
                    const newPages = parts.map(part => {
                        const trimmedPart = part.trim();
                        return {
                            component: React.createElement('code', {className : 'lsofblock'}, trimmedPart),
                        };
                    });
                    const filteredPages = newPages.filter(page => page !== null);
                    //setPages(filteredPages);
                    setPages(prevData => ({
                        ...prevData,
                        [instanceid]: filteredPages,
                    }));
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            }
        }
    }, [data]);

    // Check if pages[currentPage] exists before render
    const currentPageContent = pages[instanceid] && pages[instanceid][currentPage] ? pages[instanceid][currentPage].component : React.createElement('h3', { className : 'text-center' }, 'Loading...');

    // Create container
    if (!shouldFetch && !data[instanceid]) return null;

    return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {className : 'row'},
            React.createElement('div', { className: 'col-12' },
                React.createElement('h3', { className: 'text-center' }, "Services")
            ),
            React.createElement('div', { className: 'col-12'},
                currentPageContent
            ),
            React.createElement('div', {className: 'row'},
                React.createElement('div', { className: 'col-12 controls'},
                    React.createElement('button', {
                        onClick: () => setCurrentPage(oldPage => Math.max(oldPage - 1, 0)), className: 'ssmbuttons'
                    }, 'Previous service'),
                    React.createElement('button', {
                        onClick: () => setCurrentPage(oldPage => Math.min(oldPage + 1, pages[instanceid].length - 1 || 0)), className: 'ssmbuttons'
                    }, 'Next service'),
                    React.createElement('select', {
                            name: "select_services",
                            onChange: (event) => setCurrentPage(parseInt(event.target.value, 10))
                        }, 
                            (data[instanceid] || []).map((data, index) =>
                                React.createElement('option', {
                                    value: index,
                                    key : index
                                }, `${data}`)
                            )
                        ),
                React.createElement('div', {}, `Service ${currentPage + 1} of ${pages[instanceid]?.length || "-"}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
            )),
        ),
        React.createElement('hr', { className: 'ssmhr' })
    );
}

/* PROCESS PERMISES */

const processpermises = ({ instanceid, region, shouldFetch = true }) => {
    // Constants
    const [data, setData] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [topRow, setTopRow] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [filters, setFilters] = useState({});
    const updateButtonRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
    const [headerHoverIndex, setHeaderHoverIndex] = useState(null);
    const [filteredData, setFilteredData] = useState([]);

    // Fecth data
    const fetchData = useCallback(() => {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                const rows = data[instanceid];
                setFilteredData(rows.filter(row => {
                    return Object.entries(filters).every(([columnIndex, filter]) => {
                        return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                    });
                }));
            }
        } else {
            axios.get('/get_data_ssm_processpermises', { params: { instanceid: instanceid, region: region } })
                .then(response => {
                    if (response === "None"){
                        return;
                    }
                    const rows = response.data.split('\n')
                    .map(item => {
                        const row = item.trim().split(' ');
                        if (row.length === 19) {
                            row.push('-');
                        }
                        return row;
                    })
                    .filter(item => item.filter(Boolean).length);



                    setData(prevData => ({
                        ...prevData,
                        [instanceid]: rows,
                    }));
                });
        }
    }, [instanceid, region, filters, data, shouldFetch]);

    useEffect(fetchData, [instanceid, region]);

    // Button
    useEffect(() => {
    const button = updateButtonRef.current;

    if (button) {
        button.addEventListener('click', fetchData);
    }

    return () => {
        if (button) {
        button.removeEventListener('click', fetchData);
        }
    };
    }, []);

    useEffect(() => {
        if (Object.keys(data).length > 0 && data[instanceid]) {
            setCurrentPage(0);
            setFilteredData(data[instanceid].filter(row => {
                return Object.entries(filters).every(([columnIndex, filter]) => {
                    return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                });
            }));
        }
    }, [filters, data]);

    // Update pages with changerow
    const startRow = currentPage * pageSize;

    const changePage = page => {
        setCurrentPage(page);
        setTopRow(page * pageSize);
    };

    useEffect(() => {
        const newPage = Math.floor(topRow / pageSize);
        setCurrentPage(newPage);
    }, [pageSize]);

    // Update paginatedData calculation
    const paginatedData = filteredData.slice(startRow, startRow + pageSize);
    const totalPages = Math.ceil(filteredData.length / pageSize);

    const headers = ["PID", "USER", "FUSER", "FGROUP", "UID", "GID", "EUID", "EGID", "RGID", "FGID", "FUID", "SUID", "SGID", "LUID", "OWNER", "PGID", "PPID", "SUPGID", "SUPGRP", "COMMAND"]

    // Order
    const onSort = key => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'none';
        }
        setSortConfig({ key, direction });
    };

    // Order Effect
    useEffect(() => {
        if (sortConfig.direction === 'none') {
            setFilteredData(Array.isArray(data[instanceid]) ? [...data[instanceid]] : []);
        } else {
            const sortedData = [...data[instanceid]].sort((a, b) => {
                const aValue = isNaN(a[sortConfig.key]) ? a[sortConfig.key] : Number(a[sortConfig.key]);
                const bValue = isNaN(b[sortConfig.key]) ? b[sortConfig.key] : Number(b[sortConfig.key]);

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
            setFilteredData(sortedData);
        }
    }, [sortConfig, data]);
    
    // Create container
    if (!shouldFetch && !data[instanceid]) return null;

    return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { className: 'row' },
            React.createElement('div', { className: 'col-12' },
                React.createElement('h3', { className: 'text-center' }, "Number of processes: " + filteredData.length)
            ),
            React.createElement('details', null,
                React.createElement('summary', null, "Filters"),
                headers ? [...Array(Math.ceil(headers?.length / 4))].map((_, rowIndex) => 
                    React.createElement('div', { className: 'row', key: rowIndex },
                        headers?.slice(rowIndex * 4, (rowIndex + 1) * 4).map((header, index) =>
                            React.createElement('div', { className: 'col-3', key: index },
                                React.createElement('input', {
                                    type: 'text',
                                    className: 'form-control', 
                                    placeholder: header,
                                    value: filters[rowIndex * 4 + index] || '',
                                    name: header,
                                    onChange: e => setFilters({...filters, [rowIndex * 4 + index]: e.target.value})
                                })
                            )
                        )
                    )
                ) : null,
            ),
            data[instanceid] ? React.createElement('div', { className: 'row'},
                React.createElement('div', { className: 'col-12', style: { overflowX: "auto" }},
                    React.createElement('table', { className: 'table table-hover table-bordered' },
                        React.createElement('thead', null,
                            React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                            headers?.map((header, index) => 
                                React.createElement('th', {
                                    key: index,
                                    onClick: () => onSort(index),
                                    onMouseEnter: () => setHeaderHoverIndex(index),
                                    onMouseLeave: () => setHeaderHoverIndex(null),
                                    style: { position: 'relative', cursor : 'pointer' }
                                }, 
                                headerHoverIndex === index 
                                    ? React.createElement('span', {
                                            style: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }
                                        }, index === sortConfig.key
                                            ? (sortConfig.direction === 'ascending' ? '↑' : sortConfig.direction === 'descending' ? '↓' : '-')
                                            : '-')
                                        : null,
                                React.createElement('span', { 
                                    style: { 
                                        visibility: headerHoverIndex === index ? 'hidden' : 'visible' 
                                    } 
                                }, header))
                            )
                        )
                        ),
                        React.createElement('tbody', null, 
                            paginatedData.map((row, index) => 
                            React.createElement('tr', { key: index }, 
                                row.map((cell, index) => React.createElement('td', { key: index }, cell))
                            )
                            )
                        )
                    )
                )
            ) : React.createElement('h3', { className : 'text-center' }, 'Loading...'),
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12 controls' },
                React.createElement('button', { onClick: () => changePage(currentPage - 1), disabled: startRow < 1, className: 'ssmbuttons' }, 'Previous Page'),
                React.createElement('button', { onClick: () => changePage(currentPage + 1), disabled: currentPage >= totalPages - 1, className: 'ssmbuttons' }, 'Next Page'),
                React.createElement('label', null, 
                    'Rows per page: ',
                    React.createElement('select', { 
                        value: pageSize,
                        name: "select_processesperms",
                        onChange: e => setPageSize(Number(e.target.value)) 
                    }, 
                    React.createElement('option', { value: 5 }, '5'),
                    React.createElement('option', { value: 10 }, '10'),
                    React.createElement('option', { value: 20 }, '20'),
                    React.createElement('option', { value: 50 }, '50')
                    )
                ),
                React.createElement('div', null, `Page ${Math.floor(startRow / pageSize) + 1} of ${totalPages}`),
                React.createElement('div', null, `Rows ${startRow + 1} - ${Math.min((startRow + pageSize), filteredData.length)} of ${filteredData.length}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
                )
            )
        ),
        React.createElement('hr', { className: 'ssmhr' })
    );
}

/* Process data */

const processdata = ({ instanceid, region, shouldFetch = true }) => {
    // Constants
    const [data, setData] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [topRow, setTopRow] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [filters, setFilters] = useState({});
    const updateButtonRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
    const [headerHoverIndex, setHeaderHoverIndex] = useState(null);
    const [filteredData, setFilteredData] = useState([]);

    // Fetch data
    const fetchData = useCallback(() => {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                const rows = data[instanceid];
                setFilteredData(rows.filter(row => {
                    return Object.entries(filters).every(([columnIndex, filter]) => {
                        return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                    });
                }));
            }
        } else {
            axios.get('/get_data_ssm_processdata', { params: { instanceid: instanceid, region: region} })
                .then(response => {
                if (response === "None"){
                    return;
                }
                const rows = response.data.split('\n')
                .filter(item => item.trim().length > 0)
                .map(item => {
                    const splitRow = item.trim().split(' ');
                    const commandPart = splitRow.slice(18).join(' ');
                    return [...splitRow.slice(0, 18), commandPart];
                });
                setData(prevData => ({
                    ...prevData,
                    [instanceid]: rows,
                }));
                });
        }
    }, [instanceid, region, filters, data, shouldFetch]);

    useEffect(fetchData, [instanceid, region]);

    // Button
    useEffect(() => {
        const button = updateButtonRef.current;

        if (button) {
            button.addEventListener('click', fetchData);
        }

        return () => {
            if (button) {
            button.removeEventListener('click', fetchData);
            }
        };
    }, []);

    useEffect(() => {
        if (Object.keys(data).length > 0 && data[instanceid]) {
            setCurrentPage(0);
            setFilteredData(data[instanceid].filter(row => {
                return Object.entries(filters).every(([columnIndex, filter]) => {
                    return row[columnIndex] ? row[columnIndex].includes(filter) : false;
                });
            }));
        }
    }, [filters, data]);
    
    // Update pages with changerow
    const startRow = currentPage * pageSize;

    const changePage = page => {
        setCurrentPage(page);
        setTopRow(page * pageSize);
    };

    useEffect(() => {
        const newPage = Math.floor(topRow / pageSize);
        setCurrentPage(newPage);
    }, [pageSize]);

    // Update paginatedData calculation
    const paginatedData = filteredData.slice(startRow, startRow + pageSize);
    const totalPages = Math.ceil(filteredData.length / pageSize);

    // Order
    const onSort = key => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'none';
        }
        setSortConfig({ key, direction });
    };

    const headers = ["PID", "USER", "UID", "SESS", "TT", "STARTED", "TIME", "STAT", "PSR", "NI", "PRI", "RTPRIO", "%CPU", "%MEM", "VSZ", "RSS", "F", "WCHAN", "COMMAND"]

    // Order Effect
    useEffect(() => {
    if (sortConfig.direction === 'none') {
        setFilteredData(Array.isArray(data[instanceid]) ? [...data[instanceid]] : []);
    } else {
        const sortedData = [...data[instanceid]].sort((a, b) => {
            const aValue = isNaN(a[sortConfig.key]) ? a[sortConfig.key] : Number(a[sortConfig.key]);
            const bValue = isNaN(b[sortConfig.key]) ? b[sortConfig.key] : Number(b[sortConfig.key]);

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        setFilteredData(sortedData);
    }
    }, [sortConfig, data]);

    // Create container
    if (!shouldFetch && !data[instanceid]) return null;

    return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { className: 'row' },
            React.createElement('div', { className: 'col-12' },
                React.createElement('h3', { className: 'text-center' }, "Number of processes: " + filteredData.length)
            ),
            React.createElement('details', null,
                React.createElement('summary', null, "Filters"),
                headers ? [...Array(Math.ceil(headers?.length / 4))].map((_, rowIndex) => 
                    React.createElement('div', { className: 'row', key: rowIndex },
                        headers?.slice(rowIndex * 4, (rowIndex + 1) * 4).map((header, index) =>
                            React.createElement('div', { className: 'col-3', key: index },
                                React.createElement('input', { 
                                    type: 'text',
                                    className: 'form-control', 
                                    placeholder: header,
                                    value: filters[rowIndex * 4 + index] || '',
                                    name: header,
                                    onChange: e => setFilters({...filters, [rowIndex * 4 + index]: e.target.value})
                                })
                            )
                        )
                    )
                ) : null,
            ),
            data[instanceid] ? React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12', style: { overflowX: "auto" }},
                    React.createElement('table', { className: 'table table-hover table-bordered' },
                        React.createElement('thead', null,
                            React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                                headers?.map((header, index) => 
                                    React.createElement('th', {
                                        key: index,
                                        onClick: () => onSort(index),
                                        onMouseEnter: () => setHeaderHoverIndex(index),
                                        onMouseLeave: () => setHeaderHoverIndex(null),
                                        style: { position: 'relative', cursor : 'pointer' }
                                    }, 
                                    headerHoverIndex === index 
                                        ? React.createElement('span', {
                                            style: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }
                                        }, index === sortConfig.key
                                            ? (sortConfig.direction === 'ascending' ? '↑' : sortConfig.direction === 'descending' ? '↓' : '-')
                                            : '-')
                                        : null,
                                    React.createElement('span', { 
                                        style: { 
                                            visibility: headerHoverIndex === index ? 'hidden' : 'visible' 
                                        } 
                                    }, header))
                                )
                            )
                        ),
                        React.createElement('tbody', null, 
                            paginatedData.map((row, index) => 
                            React.createElement('tr', { key: index }, 
                                row.map((cell, index) => React.createElement('td', { key: index }, cell))
                            )
                            )
                        )
                    )
                )
            ) : React.createElement('h3', { className : 'text-center' }, 'Loading...'),
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12 controls' },
                React.createElement('button', { onClick: () => changePage(currentPage - 1), disabled: startRow < 1, className: 'ssmbuttons' }, 'Previous Page'),
                React.createElement('button', { onClick: () => changePage(currentPage + 1), disabled: currentPage >= totalPages - 1, className: 'ssmbuttons' }, 'Next Page'),
                React.createElement('label', null, 
                    'Rows per page: ',
                    React.createElement('select', { 
                        value: pageSize,
                        name: "select_processesstats",
                        onChange: e => setPageSize(Number(e.target.value)) 
                    }, 
                    React.createElement('option', { value: 5 }, '5'),
                    React.createElement('option', { value: 10 }, '10'),
                    React.createElement('option', { value: 20 }, '20'),
                    React.createElement('option', { value: 50 }, '50')
                    )
                ),
                React.createElement('div', null, `Page ${Math.floor(startRow / pageSize) + 1} of ${totalPages}`),
                React.createElement('div', null, `Rows ${startRow + 1} - ${Math.min((startRow + pageSize), filteredData.length)} of ${filteredData.length}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
                )
            )
        ),
        React.createElement('hr', { className: 'ssmhr' })
    );
}

/* Process lsof */

const processlsof = ({ instanceid, region, shouldFetch = true }) => {
    // Constants
    const [currentPage, setCurrentPage] = useState(0);
    const [data, setData] = useState({});
    const updateButtonRef = useRef(null);

    // Fecth data
    const fetchData = useCallback(() =>  {
        if (!shouldFetch) {
            if (data && data[instanceid]) {
                return null;
            }
        } else {
            axios.get('/get_data_ssm_lsof', { params: { instanceid: instanceid, region: region } })
            .then(response => {
                if (response === "None"){
                    return;
                }
                const parts = response.data.split('x&-z$');
                const newPages = parts.map(part => {
                    const trimmedPart = part.trim();
                    const lines = trimmedPart.split('\n');

                    //  Null value
                    if (lines.length < 2) {
                        return null;
                    }

                    const words = lines[1].split(/\s+/).filter(word => word.length > 0);
                    const processName = words[0];
                    const pid = words[1];

                    return {
                        component: React.createElement('code', {className : 'lsofblock'}, part),
                        processName,
                        pid
                    };
                });

                const filteredPages = newPages.filter(page => page !== null);

                setData(prevData => ({
                    ...prevData,
                    [instanceid]: filteredPages,
                }));
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }
    }, [instanceid, region, data, shouldFetch]);

    useEffect(fetchData, [instanceid, region]);

    useEffect(() => {
        const button = updateButtonRef.current;

        if (button) {
            button.addEventListener('click', fetchData);
        }

        return () => {
            if (button) {
                button.removeEventListener('click', fetchData);
            }
        };
    }, []);

    // Check if data[currentPage] exists before render
    const currentPageContent = data[instanceid] && data[instanceid][currentPage] ? data[instanceid][currentPage].component : React.createElement('h3', { className : 'text-center' }, 'Loading...');

    // Create container
    if (!shouldFetch && !data[instanceid]) return null;
    
    return React.createElement('div', {className : 'row'},
        React.createElement('div', { className: 'col-12' },
            React.createElement('h3', { className: 'text-center' }, "Processes details")
        ),
        React.createElement('div', {className: 'row'},
            React.createElement('div', { className: 'col-12'},
                currentPageContent
        )),
        React.createElement('div', {className: 'row'},
            React.createElement('div', { className: 'col-12 controls'},
                React.createElement('button', {
                    onClick: () => setCurrentPage(oldPage => Math.max(oldPage - 1, 0)), className: 'ssmbuttons'
                }, 'Previous process'),
                React.createElement('button', {
                    onClick: () => setCurrentPage(oldPage => Math.min(oldPage + 1, data[instanceid].length - 1)), className: 'ssmbuttons'
                }, 'Next process'),
                React.createElement('select', {
                        name: "select_processesdetails",
                        onChange: (event) => setCurrentPage(parseInt(event.target.value, 10))
                    },
                        data[instanceid]?.map((page, index) =>
                            React.createElement('option', {
                                value: index,
                                key : index
                            }, `${page.processName} (${page.pid})`)
                        )
                    ),
                React.createElement('div', {}, `Process ${currentPage + 1} of ${data[instanceid]?.length || "-"}`),
                React.createElement('button', { ref: updateButtonRef, className: 'ssmbuttons' }, 'Update Data')
        )),
    );
}

/* Funtions for SSM buttons */

// Left os and last

const instanceQueryRecord = new Set();

const queryssm = (instanceid) => {
    document.getElementById("ssm-data-instance").innerHTML = "Instance: " + instanceid;

    ReactDOM.render(React.createElement(w,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('w'));
    ReactDOM.render(React.createElement(connections,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('connections'));
    ReactDOM.render(React.createElement(updatepackages,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('updatepackages'));
    ReactDOM.render(React.createElement(installedpackages,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('installedpackages'));
    ReactDOM.render(React.createElement(services,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('services'));
    ReactDOM.render(React.createElement(processpermises,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('processpermises'));
    ReactDOM.render(React.createElement(processdata,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('processdata'));
    ReactDOM.render(React.createElement(processlsof,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: true  }), document.getElementById('processlsof'));

    if (!instanceQueryRecord.has(instanceid)) {
        instanceQueryRecord.add(instanceid);
    }

}

const showssm = (instanceid) => {

    if (!instanceQueryRecord.has(instanceid)) {
        showdangeralert('You need to make a query first on ' + instanceid);
        return;
    }

    document.getElementById("ssm-data-instance").innerHTML = "Instance: " + instanceid;

    ReactDOM.render(React.createElement(w,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false }), document.getElementById('w'));
    ReactDOM.render(React.createElement(connections,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false }), document.getElementById('connections'));
    ReactDOM.render(React.createElement(updatepackages,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false }), document.getElementById('updatepackages'));
    ReactDOM.render(React.createElement(installedpackages,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false }), document.getElementById('installedpackages'));
    ReactDOM.render(React.createElement(services,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false }), document.getElementById('services'));
    ReactDOM.render(React.createElement(processpermises,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false }), document.getElementById('processpermises'));
    ReactDOM.render(React.createElement(processdata,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false }), document.getElementById('processdata'));
    ReactDOM.render(React.createElement(processlsof,{ instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region'], shouldFetch: false  }), document.getElementById('processlsof'));

}

// startmonitorssm and stopmonitorssm functions are in ec2ssmmonitor.js

/* Instances searcher */

$(document).ready(function() {
    $("#searchinstances").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        $("#ssm-instances > div:not(#searchinstances)").filter(function() {
            if ($(this).text().toLowerCase().indexOf(value) > -1) {
                $(this).removeClass('hidden-important');
            } else {
                $(this).addClass('hidden-important'); 
            }
        });
    });
});