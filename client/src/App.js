import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginRegister from './components/LoginRegister';
import NegotiationList from './components/NegotiationList';
import NegotiationForm from './components/NegotiationForm';
import NegotiationDetail from './components/NegotiationDetail';
import MediationView from './components/MediationView';
import SearchFilter from './components/SearchFilter';
import './styles/App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [negotiations, setNegotiations] = useState([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showMediationView, setShowMediationView] = useState(false);
  const [filteredNegotiations, setFilteredNegotiations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Use environment variable for API base URL, default to localhost:5001 for development
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Handle session expiration
  const handleSessionExpired = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setError('Session expired. Please log in again.');
    setSelectedNegotiation(null);
    setNegotiations([]);
    setFilteredNegotiations([]);
  };

  // Check for existing auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    const savedUserId = localStorage.getItem('userId');

    if (savedToken && savedUsername && savedUserId) {
      setToken(savedToken);
      setUser({ username: savedUsername, userId: savedUserId });
      setIsAuthenticated(true);
    }
  }, []);

  // Configure axios interceptor for handling token expiration globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        // Check if error is due to token expiration
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
          handleSessionExpired();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Fetch negotiations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNegotiations();
    }
  }, [isAuthenticated]);

  // Create axios instance with auth header
  const getAxiosConfig = () => {
    const savedToken = token || localStorage.getItem('token');
    return {
      headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
    };
  };

  const fetchNegotiations = () => {
    setIsLoading(true);
    setError(null);
    axios.get(`${API_BASE_URL}/negotiations`, getAxiosConfig())
      .then(res => {
        setNegotiations(res.data);
        setFilteredNegotiations(res.data);
      })
      .catch(err => {
        const errorMsg = err.response?.data?.error || 'Failed to fetch negotiations';
        setError(errorMsg);
        console.error('Error fetching negotiations:', err);
      })
      .finally(() => setIsLoading(false));
  };

  // Handle search
  const handleSearch = (query, filters = {}) => {
    if (query.trim() === '' && Object.keys(filters).length === 0) {
      setFilteredNegotiations(negotiations);
      return;
    }

    setIsLoading(true);
    setError(null);
    axios.post(`${API_BASE_URL}/search`, { query, filters }, getAxiosConfig())
      .then(res => setFilteredNegotiations(res.data))
      .catch(err => {
        const errorMsg = err.response?.data?.error || 'Search failed';
        setError(errorMsg);
        console.error('Search error:', err);
      })
      .finally(() => setIsLoading(false));
  };

  // Create negotiation
  const handleCreateNegotiation = (formData) => {
    setError(null);
    axios.post(`${API_BASE_URL}/negotiations`, formData, getAxiosConfig())
      .then(res => {
        setNegotiations([res.data, ...negotiations]);
        setFilteredNegotiations([res.data, ...negotiations]);
        setShowForm(false);
      })
      .catch(err => {
        const errorMsg = err.response?.data?.details?.[0] || err.response?.data?.error || 'Failed to create negotiation';
        setError(errorMsg);
        console.error('Error creating negotiation:', err);
      });
  };

  // Select negotiation
  const handleSelectNegotiation = (negotiation) => {
    setError(null);
    axios.get(`${API_BASE_URL}/negotiations/${negotiation.id}`, getAxiosConfig())
      .then(res => setSelectedNegotiation(res.data))
      .catch(err => {
        const errorMsg = err.response?.data?.error || 'Failed to fetch negotiation details';
        setError(errorMsg);
        console.error('Error fetching negotiation details:', err);
      });
  };

  // Update negotiation
  const handleUpdateNegotiation = (id, updates) => {
    setError(null);
    return axios.put(`${API_BASE_URL}/negotiations/${id}`, updates, getAxiosConfig())
      .then(() => {
        fetchNegotiations();
        if (selectedNegotiation?.id === id) {
          return axios.get(`${API_BASE_URL}/negotiations/${id}`, getAxiosConfig())
            .then(res => setSelectedNegotiation(res.data));
        }
      })
      .catch(err => {
        const errorMsg = err.response?.data?.details?.[0] || err.response?.data?.error || 'Failed to update negotiation';
        setError(errorMsg);
        console.error('Error updating negotiation:', err);
        throw err;
      });
  };

  // Delete negotiation with confirmation
  const handleDeleteNegotiation = (id, negotiationName) => {
    const confirmed = window.confirm(
      `Are you sure you want to close this case?\n\n` +
      `Case: ${negotiationName}\n\n` +
      `This will soft-delete the negotiation. The case data will be preserved but hidden from the active list.`
    );
    
    if (confirmed) {
      setError(null);
      axios.delete(`${API_BASE_URL}/negotiations/${id}`, getAxiosConfig())
        .then(() => {
          setNegotiations(negotiations.filter(n => n.id !== id));
          setFilteredNegotiations(filteredNegotiations.filter(n => n.id !== id));
          if (selectedNegotiation?.id === id) {
            setSelectedNegotiation(null);
          }
        })
        .catch(err => {
          const errorMsg = err.response?.data?.error || 'Failed to delete negotiation';
          setError(errorMsg);
          console.error('Error deleting negotiation:', err);
        });
    }
  };

  // Open mediation view
  const handleOpenMediationView = () => {
    setShowMediationView(true);
    setShowForm(false);
  };

  // Close mediation view
  const handleCloseMediationView = () => {
    setShowMediationView(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setToken(userData.token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setNegotiations([]);
    setFilteredNegotiations([]);
    setSelectedNegotiation(null);
    setShowForm(false);
    setError(null);
  };

  // Render login page if not authenticated
  if (!isAuthenticated) {
    return <LoginRegister onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          <span>⚠️ {error}</span>
          <button className="close-btn">✕</button>
        </div>
      )}
      {isLoading && <div className="loading-overlay">Loading...</div>}
      
      <div className="app-layout">
        <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h1>⚖️ Negotiation Engine</h1>
            <div className="sidebar-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? '✕ Cancel' : '+ New'}
              </button>
              <button 
                className="btn btn-logout"
                onClick={handleLogout}
                title="Logout"
              >
                Logout ({user?.username})
              </button>
            </div>
          </div>

          <SearchFilter onSearch={handleSearch} />

          <NegotiationList
            negotiations={filteredNegotiations}
            selectedId={selectedNegotiation?.id}
            onSelect={handleSelectNegotiation}
          />
        </div>

        <div className="main-content">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {showMediationView && selectedNegotiation ? (
            <MediationView
              negotiationId={selectedNegotiation.id}
              negotiation={selectedNegotiation}
              token={token}
              onClose={handleCloseMediationView}
            />
          ) : showForm ? (
            <div className="form-section">
              <h2>Create New Negotiation</h2>
              <NegotiationForm onSubmit={handleCreateNegotiation} />
            </div>
          ) : selectedNegotiation ? (
            <NegotiationDetail
              negotiation={selectedNegotiation}
              onUpdate={handleUpdateNegotiation}
              onDelete={handleDeleteNegotiation}
              onRefresh={() => handleSelectNegotiation(selectedNegotiation)}
              onOpenMediationView={handleOpenMediationView}
              token={token}
            />
          ) : (
            <div className="empty-state">
              <p>Select a negotiation or create a new one to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
