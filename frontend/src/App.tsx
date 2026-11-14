import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BucketPage } from './pages/BucketPage'
import { HistoryPage } from './pages/HistoryPage'
import { NewScanPage } from './pages/NewScanPage'
import { LatestScanPage, ScanPage } from './pages/ScanPage'

function NotFound() {
  return (
    <div className="state">
      <h1 className="page-title">Page not found</h1>
      <Link className="btn btn-secondary" to="/">
        Go to latest results
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LatestScanPage />} />
          <Route path="scans" element={<HistoryPage />} />
          <Route path="scans/new" element={<NewScanPage />} />
          <Route path="scans/:id" element={<ScanPage />} />
          <Route path="scans/:id/buckets/:bucket" element={<BucketPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
