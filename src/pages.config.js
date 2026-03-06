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
import AddEquipment from './pages/AddEquipment';
import Admin from './pages/Admin';
import Chat from './pages/Chat';
import CompleteProfile from './pages/CompleteProfile';
import Directory from './pages/Directory';
import EquipmentDetail from './pages/EquipmentDetail';
import Explore from './pages/Explore';
import Home from './pages/Home';
import MapView from './pages/MapView';
import Onboarding from './pages/Onboarding';
import Partners from './pages/Partners';
import PendingApproval from './pages/PendingApproval';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Rewards from './pages/Rewards';
import Settings from './pages/Settings';
import Specialists from './pages/Specialists';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddEquipment": AddEquipment,
    "Admin": Admin,
    "Chat": Chat,
    "CompleteProfile": CompleteProfile,
    "Directory": Directory,
    "EquipmentDetail": EquipmentDetail,
    "Explore": Explore,
    "Home": Home,
    "MapView": MapView,
    "Onboarding": Onboarding,
    "Partners": Partners,
    "PendingApproval": PendingApproval,
    "Profile": Profile,
    "PublicProfile": PublicProfile,
    "Rewards": Rewards,
    "Settings": Settings,
    "Specialists": Specialists,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};