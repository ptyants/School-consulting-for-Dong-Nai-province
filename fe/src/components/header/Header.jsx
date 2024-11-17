// import React from 'react';

// Import from components
import { openChatbotDialog } from '../dialog/dialog_entries';
import Button from '../button/Button';

/**
 * @typedef HeaderProps
 * @property {string | JSX.Element | (() => string | JSX.Element) | undefined} title
 */

/**
 * Component này render ra header.
 * @param {HeaderProps} props 
 * @returns 
 */
export default function Header() {
  return (
    <header className="border-b border-gray p-4 sticky top-0 backdrop-blur-xl" style={{ zIndex: 1 }}>
      <section
        className="flex flex-col w-full max-w-screen-xl mx-auto items-center justify-between xl:flex xl:flex-row xl:items-center xl:justify-between"
      >
        <img src="http://sgddt.dongnai.gov.vn/Portals/0/logodn.png?fbclid=IwZXh0bgNhZW0CMTAAAR1z5p6Xdj3PdQBAsGzptj84XyjxhMkOw3wELRpJo6Hv88J_J06gyr-8TXg_aem_AS8r_QXrzNJzfidUVxV5AsTW9ZpA0LJXF7KhnmZaYUAMA96YxLXOhyjo01sC1YYmlXMGIOc2HR3mxXeuoZKDVZyx" 
         className="w-2000 h-30 "/>
        <div className="flex">
  
          <Button
            extendClassName="w-2000 h-20 text-white mr-3 font-medium border border-rose-800 border-2 flex"
            color="sky-500" hoverColor="sky-700" activeColor="rose-950"
            onClick={() => openChatbotDialog()}
          >
            
            🤖 Hỏi AI...
          </Button>
        </div>
      </section>
    </header>
  )
}