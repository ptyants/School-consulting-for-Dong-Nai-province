// import React from 'react'

/**
 * Use this function component to render navbar (Used in PageLayout).
 * @returns 
 */
export default function Navbar() {
  return (
    <div className="bg-sky-600">
      <div className="max-w-[1300px] mx-auto">
        <nav className="">
          <ul className="flex justify-around align-center text-white font-bold">
            <li className="hover:bg-sky-400"><a href="https://dongnai.gov.vn/" className="block p-4">Đào tạo</a></li>
            <li className="hover:bg-sky-400"><a href="https://dongnai.tsdc.edu.vn/thong-tin-tuyen-sinh-home/75/S%E1%BB%9F%20GD&%C4%90T" className="block p-4">Tuyển sinh</a></li>
            <li className="hover:bg-sky-400"><a href="https://dongnai.gov.vn/Pages/tintucsukien.aspx" className="block p-4">Tin tức</a></li>
            <li className="hover:bg-sky-400"><a href="http://sgddt.dongnai.gov.vn/chi-dao/thong-bao.html" className="block p-4">Thông báo</a></li>
            <li className="hover:bg-sky-400"><a href="https://tcgd.tapchigiaoduc.edu.vn/index.php/tapchi/index" className="block p-4">Tạp chí</a></li>
          </ul>
        </nav>
      </div>
    </div>
  )
}