/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';

// Code-Splitting: Jede Seite wird erst beim Aufruf geladen (React.lazy).
// Das reduziert das initiale Bundle drastisch und beschleunigt alle Seiten.
// App.jsx rendert die Routen bereits in <Suspense> mit Fallback.
const AGB = lazy(() => import('./pages/AGB'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AI = lazy(() => import('./pages/AI'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const AIPage = lazy(() => import('./pages/AIPage'));
const ARKnotenAssistent = lazy(() => import('./pages/ARKnotenAssistent'));
const ARView = lazy(() => import('./pages/ARView'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const Analysis = lazy(() => import('./pages/Analysis'));
const AngelscheinPruefungSchonzeiten = lazy(() => import('./pages/AngelscheinPruefungSchonzeiten'));
const BaitMixer = lazy(() => import('./pages/BaitMixer'));
const BathymetricCrowdsourcing = lazy(() => import('./pages/BathymetricCrowdsourcing'));
const CatchCam = lazy(() => import('./pages/CatchCam'));
const Community = lazy(() => import('./pages/Community'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Datenschutz = lazy(() => import('./pages/Datenschutz'));
const DeviceIntegration = lazy(() => import('./pages/DeviceIntegration'));
const Devices = lazy(() => import('./pages/Devices'));
const Events = lazy(() => import('./pages/Events'));
const FunctionRatings = lazy(() => import('./pages/FunctionRatings'));
const Gear = lazy(() => import('./pages/Gear'));
const GearV1 = lazy(() => import('./pages/GearV1'));
const Home = lazy(() => import('./pages/Home'));
const Impressum = lazy(() => import('./pages/Impressum'));
const KiBuddyBeta = lazy(() => import('./pages/KiBuddyBeta'));
const Licenses = lazy(() => import('./pages/Licenses'));
const Log = lazy(() => import('./pages/Log'));
const Logbook = lazy(() => import('./pages/Logbook'));
const LiveTripPage = lazy(() => import('./pages/LiveTripPage'));
const Map = lazy(() => import('./pages/Map'));
const MapPage = lazy(() => import('./pages/MapPage'));
const Match3Game = lazy(() => import('./pages/Match3Game'));
const Premium = lazy(() => import('./pages/Premium'));
const PremiumDebug = lazy(() => import('./pages/PremiumDebug'));
const PremiumPlans = lazy(() => import('./pages/PremiumPlans'));
const Profile = lazy(() => import('./pages/Profile'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Rank = lazy(() => import('./pages/Rank'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Settings = lazy(() => import('./pages/Settings'));
const Shop = lazy(() => import('./pages/Shop'));
const Start = lazy(() => import('./pages/Start'));
const StartFishing = lazy(() => import('./pages/StartFishing'));
const TripPlanner = lazy(() => import('./pages/TripPlanner'));
const Tutorials = lazy(() => import('./pages/Tutorials'));
const UsedGear = lazy(() => import('./pages/UsedGear'));
const VoiceControl = lazy(() => import('./pages/VoiceControl'));
const VoiceLecture = lazy(() => import('./pages/VoiceLecture'));
const WaterAnalysis = lazy(() => import('./pages/WaterAnalysis'));
const Weather = lazy(() => import('./pages/Weather'));
const WeatherAlerts = lazy(() => import('./pages/WeatherAlerts'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "AGB": AGB,
    "AuthCallback": AuthCallback,
    "AI": AI,
    "AIAssistant": AIAssistant,
    "AIPage": AIPage,
    "ARKnotenAssistent": ARKnotenAssistent,
    "ARView": ARView,
    "AdminUsers": AdminUsers,
    "Analysis": Analysis,
    "AngelscheinPruefungSchonzeiten": AngelscheinPruefungSchonzeiten,
    "BaitMixer": BaitMixer,
    "BathymetricCrowdsourcing": BathymetricCrowdsourcing,
    "CatchCam": CatchCam,
    "Community": Community,
    "Dashboard": Dashboard,
    "Datenschutz": Datenschutz,
    "DeviceIntegration": DeviceIntegration,
    "Devices": Devices,
    "Events": Events,
    "FunctionRatings": FunctionRatings,
    "Gear": Gear,
    "GearV1": GearV1,
    "Home": Home,
    "Impressum": Impressum,
    "KiBuddyBeta": KiBuddyBeta,
    "Licenses": Licenses,
    "Log": Log,
    "Logbook": Logbook,
    "LiveTrip": LiveTripPage,
    "Map": Map,
    "MapPage": MapPage,
    "Match3Game": Match3Game,
    "Premium": Premium,
    "PremiumDebug": PremiumDebug,
    "PremiumPlans": PremiumPlans,
    "Profile": Profile,
    "Quiz": Quiz,
    "Rank": Rank,
    "ResetPassword": ResetPassword,
    "Settings": Settings,
    "Shop": Shop,
    "Start": Start,
    "StartFishing": StartFishing,
    "TripPlanner": TripPlanner,
    "Tutorials": Tutorials,
    "UsedGear": UsedGear,
    "VoiceControl": VoiceControl,
    "VoiceLecture": VoiceLecture,
    "WaterAnalysis": WaterAnalysis,
    "Weather": Weather,
    "WeatherAlerts": WeatherAlerts,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};