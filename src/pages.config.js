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
const AddEquipment = lazy(() => import('./pages/AddEquipment.jsx'));
const Admin = lazy(() => import('./pages/Admin'));
const Chat = lazy(() => import('./pages/Chat'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const Directory = lazy(() => import('./pages/Directory'));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail'));
const Explore = lazy(() => import('./pages/Explore'));
const Home = lazy(() => import('./pages/Home'));
const MapView = lazy(() => import('./pages/MapView'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Partners = lazy(() => import('./pages/Partners'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Settings = lazy(() => import('./pages/Settings'));
const Specialists = lazy(() => import('./pages/Specialists'));
const BulletinBoard = lazy(() => import('./pages/BulletinBoard'));
const BulletinNewPost = lazy(() => import('./pages/BulletinNewPost'));
const BulletinPost = lazy(() => import('./pages/BulletinPost'));
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
    "BulletinBoard": BulletinBoard,
    "BulletinNewPost": BulletinNewPost,
    "BulletinPost": BulletinPost,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};