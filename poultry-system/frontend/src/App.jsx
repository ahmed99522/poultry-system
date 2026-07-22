import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import Customers from './pages/Customers.jsx';
import Products from './pages/Products.jsx';
import Weighing from './pages/Weighing.jsx';
import Distribution from './pages/Distribution.jsx';
import Invoices from './pages/Invoices.jsx';
import Users from './pages/Users.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="orders"
          element={
            <ProtectedRoute roles={['admin', 'distributor']}>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="weighing"
          element={
            <ProtectedRoute roles={['admin', 'weigher']}>
              <Weighing />
            </ProtectedRoute>
          }
        />
        <Route
          path="distribution"
          element={
            <ProtectedRoute roles={['admin', 'distributor']}>
              <Distribution />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedRoute roles={['admin', 'distributor']}>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute roles={['admin', 'distributor']}>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="products"
          element={
            <ProtectedRoute roles={['admin']}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}
