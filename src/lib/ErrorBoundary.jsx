import React from 'react';

const isChunkLoadError = (error) =>
  error &&
  (error.name === 'ChunkLoadError' ||
    (error instanceof TypeError &&
      (error.message.includes('dynamically imported module') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('Loading chunk'))));

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error });
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      window.location.reload();
      return;
    }
    this.setState(prevState => ({
      hasError: false,
      error: null,
      isChunkError: false,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleFullPageReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isMinimalError = this.props.isMinimal === true;
      const isFull = this.props.isFull !== false;
      const { isChunkError, retryCount, error } = this.state;

      if (isMinimalError) {
        return (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center" role="alert">
            <p className="text-sm text-red-400 mb-3">
              {isChunkError
                ? 'Modul konnte nicht geladen werden. Netzwerkproblem?'
                : 'Komponente konnte nicht geladen werden'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors min-h-[44px]"
              aria-label={isChunkError ? 'Seite neu laden' : 'Komponente erneut laden'}
            >
              {isChunkError ? 'Seite neu laden' : 'Erneut versuchen'}
            </button>
          </div>
        );
      }

      return (
        <div
          className={`${isFull ? 'min-h-screen' : 'p-6 rounded-lg'} bg-gray-950 text-white flex items-center justify-center`}
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold">
              {isChunkError ? 'Ladefehler' : 'Fehler beim Laden'}
            </h1>
            <p className="text-gray-400 text-sm">
              {isChunkError
                ? 'Ein Teil der Anwendung konnte nicht geladen werden. Dies kann an einer schlechten Netzwerkverbindung oder einem veralteten Cache liegen.'
                : error?.message || 'Ein Fehler ist aufgetreten'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRetry}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors min-h-[44px]"
                aria-label={isChunkError ? 'Seite neu laden' : 'Seite erneut versuchen zu laden'}
              >
                {isChunkError
                  ? 'Seite neu laden'
                  : `Erneut versuchen${retryCount > 0 ? ` (${retryCount})` : ''}`}
              </button>
              {!isChunkError && (
                <button
                  onClick={this.handleFullPageReload}
                  className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors min-h-[44px]"
                  aria-label="Gesamte Seite neu laden"
                >
                  Vollstaendiges Neuladen
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}