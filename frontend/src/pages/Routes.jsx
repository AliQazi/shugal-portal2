import { Route, Routes } from 'react-router-dom'
import Frontend from './Frontend'
import PublicUmrahVoucher from './PublicUmrahVoucher'

export default function Index() {
    return (
        <Routes>
            {/* Public (no login): the voucher page opened from the QR code on a printed voucher */}
            <Route path='/umrah-voucher/:token' element={<PublicUmrahVoucher />} />
            <Route path='/*' element={<Frontend />} />
        </Routes>
    )
}